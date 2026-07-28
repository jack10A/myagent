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


class LiteLLMLLM:
    def complete(self, system: str, user: str) -> str:
        if not settings.litellm_api_key:
            raise RuntimeError("LITELLM_API_KEY is not configured")

        from openai import OpenAI

        client = OpenAI(api_key=settings.litellm_api_key, base_url=settings.litellm_api_base)
        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=1200,
        )
        return response.choices[0].message.content or ""


def get_llm_client() -> LLMClient:
    if settings.ai_provider == "anthropic":
        return AnthropicLLM()
    if settings.ai_provider == "openai":
        return OpenAILLM()
    if settings.ai_provider == "litellm":
        return LiteLLMLLM()
    raise RuntimeError(f"Unsupported AI_PROVIDER: {settings.ai_provider}")
