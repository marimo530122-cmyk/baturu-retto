"""アバター選択 & 3分セッションタイマー付き Gradio UI

- 起動直後にアバター/トーンを選ぶ画面(小さな自己決定の回復)
- 3分の対話セッション(心のノイズをリセットするルーティン)
- セッション終了後、その日の気づきを要約し、次回への導線を示す
  (実際の決済処理は行わない。デモ用の導線表示のみ)
"""
import tempfile

import gradio as gr

from persona_prompts import build_system_prompt, contains_silent_negation, SUMMARY_PROMPT
from session_manager import SessionTimer, detect_trauma_signal, is_first_session, mark_session_done


def build_ui(config: dict, llm_chat, tts_engine, asr_engine):
    avatars = config["avatars"]
    session_cfg = config["session"]

    def avatar_label(a: dict) -> str:
        return f'{a["name"]} ー {a["tone"]}'

    avatar_by_label = {avatar_label(a): a for a in avatars}

    def run_llm_full(user_text: str, history: list, avatar: dict, first_session: bool, trauma_flag: bool):
        """ストリームせず一括で応答テキストを取得する(要約生成などに使う)。"""
        text = ""
        for partial in stream_llm(user_text, history, avatar, first_session, trauma_flag):
            text = partial
        return text

    def stream_llm(user_text: str, history: list, avatar: dict, first_session: bool, trauma_flag: bool):
        system_prompt = build_system_prompt(avatar, first_session, trauma_flag)
        messages = [{"role": "system", "content": system_prompt}]
        for u, a in history:
            messages.append({"role": "user", "content": u})
            messages.append({"role": "assistant", "content": a})
        messages.append({"role": "user", "content": user_text})

        partial = ""
        for chunk in llm_chat.stream_chat(messages):
            partial += chunk
            yield partial

    with gr.Blocks(title="ドクゼツAI ー こころの3分ルーティン") as demo:
        state_avatar = gr.State(None)
        state_history = gr.State([])
        state_first = gr.State(is_first_session())
        state_timer = gr.State(None)
        state_ended = gr.State(False)

        with gr.Column(visible=True) as select_screen:
            gr.Markdown(
                "## 今日、話す相手を選んでください\n"
                "どれを選んでも、正解不正解はありません。ただ、安心できる方を。"
            )
            avatar_radio = gr.Radio(
                choices=[avatar_label(a) for a in avatars],
                label="アバター・声のトーン",
            )
            start_btn = gr.Button("この相手と、3分間はじめる", variant="primary")

        with gr.Column(visible=False) as chat_screen:
            timer_display = gr.Markdown("残り 3:00")
            timer_tick = gr.Timer(1.0, active=False)
            chatbot = gr.Chatbot(label="ドクゼツAI", height=420)
            with gr.Row():
                mic_input = gr.Audio(sources=["microphone"], type="filepath", label="話す")
                text_input = gr.Textbox(label="または、書く", placeholder="今、何を感じていますか")
            send_btn = gr.Button("送る")
            audio_out = gr.Audio(label="声", autoplay=True)

        with gr.Column(visible=False) as summary_screen:
            gr.Markdown("## 今日の3分、おつかれさまでした")
            summary_box = gr.Markdown()
            gr.Markdown(
                "\n---\n"
                "続きを話したい気分の日は、いつでもここに戻ってきてください。\n\n"
                "**続けるプラン（無制限セッション・気づきの記録保存）** ー "
                "このプロトタイプでは決済は行われず、導線の表示のみのデモです。"
            )
            continue_btn = gr.Button("画面を閉じて、また明日")

        def on_start(avatar_label_selected):
            avatar = avatar_by_label.get(avatar_label_selected)
            timer = SessionTimer(
                session_cfg["duration_seconds"],
                session_cfg.get("warn_before_end_seconds", 20),
            )
            timer.start()
            return (
                gr.update(visible=False),   # select_screen
                gr.update(visible=True),    # chat_screen
                avatar,                     # state_avatar
                [],                         # state_history
                timer,                      # state_timer
                False,                      # state_ended
                gr.update(active=True),     # timer_tick
            )

        start_btn.click(
            on_start,
            inputs=[avatar_radio],
            outputs=[
                select_screen, chat_screen,
                state_avatar, state_history, state_timer, state_ended,
                timer_tick,
            ],
        )

        def on_tick(timer, history, avatar, ended):
            """毎秒: 残り時間表示の更新、時間切れなら要約画面へ切り替える。"""
            if timer is None or ended:
                return (
                    gr.update(), gr.update(active=False),
                    gr.update(), gr.update(), gr.update(), True,
                )

            remaining = int(timer.remaining())
            mins, secs = divmod(max(0, remaining), 60)
            label = f"残り {mins}:{secs:02d}"

            if not timer.is_finished():
                return (
                    label, gr.update(active=True),
                    gr.update(), gr.update(), gr.update(), ended,
                )

            summary_text = run_llm_full(SUMMARY_PROMPT, history, avatar, False, False)
            if not summary_text.strip():
                summary_text = "今日という一日を、ここまで過ごしてきたこと。それ自体が、今日のご褒美です。"
            mark_session_done()

            return (
                f"{label}(この対話はここで一区切り)",
                gr.update(active=False),
                gr.update(visible=False),
                gr.update(visible=True),
                summary_text,
                True,
            )

        timer_tick.tick(
            on_tick,
            inputs=[state_timer, state_history, state_avatar, state_ended],
            outputs=[timer_display, timer_tick, chat_screen, summary_screen, summary_box, state_ended],
        )

        def on_send(audio_path, text, history, avatar, first_session, ended):
            if ended:
                yield history, None, history, gr.update(value="")
                return

            user_text = (text or "").strip()
            if not user_text and audio_path:
                user_text = asr_engine.transcribe(audio_path)
            if not user_text:
                yield history, None, history, gr.update(value="")
                return

            trauma_flag = detect_trauma_signal(user_text)
            history = history + [[user_text, ""]]

            reply = ""
            for partial in stream_llm(user_text, history[:-1], avatar, first_session, trauma_flag):
                reply = partial
                history[-1][1] = reply
                yield history, None, history, gr.update(value="")

            flags = contains_silent_negation(reply)
            if flags:
                print(f"[safety-warning] silent negation candidates detected: {flags}")

            speaker_id = (avatar or {}).get("speaker_id", 1)
            audio_file = None
            try:
                wav_bytes = tts_engine.synthesize(reply, speaker_id)
                if wav_bytes:
                    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                    tmp.write(wav_bytes)
                    tmp.close()
                    audio_file = tmp.name
            except Exception as exc:  # VOICEVOXエンジン未起動時なども対話自体は継続させる
                print(f"[tts-warning] synthesis failed: {exc}")

            yield history, audio_file, history, gr.update(value="")

        send_btn.click(
            on_send,
            inputs=[mic_input, text_input, state_history, state_avatar, state_first, state_ended],
            outputs=[chatbot, audio_out, state_history, text_input],
        )

        def on_continue():
            return (
                gr.update(visible=True),   # select_screen
                gr.update(visible=False),  # summary_screen
                False,                     # state_ended
                is_first_session(),        # state_first (次回以降はFalseになる)
            )

        continue_btn.click(
            on_continue,
            outputs=[select_screen, summary_screen, state_ended, state_first],
        )

    return demo
