"""Ollama ローカルLLMとのストリーミング対話クライアント"""
import ollama


class OllamaChat:
    def __init__(self, base_url: str, model: str, temperature: float = 0.7):
        self.client = ollama.Client(host=base_url)
        self.model = model
        self.temperature = temperature

    def stream_chat(self, messages: list[dict]):
        """OpenAI形式に近い messages(role/content) を渡し、応答テキストの断片を順に返す。"""
        stream = self.client.chat(
            model=self.model,
            messages=messages,
            stream=True,
            options={"temperature": self.temperature},
        )
        for chunk in stream:
            content = chunk.get("message", {}).get("content", "")
            if content:
                yield content
