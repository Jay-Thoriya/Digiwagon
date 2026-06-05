"""OpenRouter chat client (OpenAI-compatible API, plain HTTP)."""

from __future__ import annotations

import json
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class LLMError(RuntimeError):
    pass


def chat(messages: list[dict], temperature: float = 0.2, json_mode: bool = False) -> str:
    if not settings.openrouter_api_key:
        raise LLMError("OPENROUTER_API_KEY is not set - add it to your .env file.")

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": settings.app_url,
        "X-Title": settings.app_name,
    }
    payload: dict = {
        "model": settings.llm_model_name,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        response = httpx.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise LLMError(f"OpenRouter request failed: {exc}") from exc

    return response.json()["choices"][0]["message"]["content"]


def chat_json(messages: list[dict], temperature: float = 0.2) -> dict:
    """Call the LLM in JSON mode. Strips markdown fences before parsing."""
    raw = chat(messages, temperature=temperature, json_mode=True).strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw[raw.find("{"):raw.rfind("}") + 1]
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LLMError(f"Model did not return valid JSON: {raw[:200]}") from exc
