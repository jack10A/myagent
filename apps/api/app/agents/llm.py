from typing import Protocol

from app.core.config import settings


class LLMClient(Protocol):
    def complete(self, system: str, user: str) -> str:
        pass


class AnthropicLLM:
    def complete(self, system: str, user: str) -> str:
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")

        from anthropic import Anthropic

        client = Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=1200,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(block.text for block in response.content if block.type == "text")


class OpenAILLM:
    def complete(self, system: str, user: str) -> str:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        response = client.responses.create(
            model=settings.ai_model,
            instructions=system,
            input=user,
        )
        return response.output_text


def get_llm_client() -> LLMClient:
    if settings.ai_provider == "anthropic":
        return AnthropicLLM()
    if settings.ai_provider == "openai":
        return OpenAILLM()
    raise RuntimeError(f"Unsupported AI_PROVIDER: {settings.ai_provider}")

