"""
Response building utilities for liquidity agent.

Handles construction of liquidity responses from parallel agent results.
"""

from typing import Optional
from ..core.constants import CHAIN_ALL, CHAIN_ETHEREUM, CHAIN_POLYGON, CHAIN_HEDERA
from ..core.models.liquidity import LiquidityResult, StructuredLiquidity


def _normalize_result(result: dict) -> dict:
    """Normalize result data types to match Pydantic model expectations."""
    normalized = result.copy()
    
    # Convert liquidity from int to string if present
    if "liquidity" in normalized and normalized["liquidity"] is not None:
        if isinstance(normalized["liquidity"], int):
            normalized["liquidity"] = str(normalized["liquidity"])
    
    # Convert sqrt_price_x96 from int to string if present
    if "sqrt_price_x96" in normalized and normalized["sqrt_price_x96"] is not None:
        if isinstance(normalized["sqrt_price_x96"], int):
            normalized["sqrt_price_x96"] = str(normalized["sqrt_price_x96"])
    
    # Handle slot0 nested structure
    if "slot0" in normalized and isinstance(normalized["slot0"], dict):
        slot0 = normalized["slot0"]
        if "sqrtPriceX96" in slot0 and isinstance(slot0["sqrtPriceX96"], int):
            slot0["sqrtPriceX96"] = str(slot0["sqrtPriceX96"])
        # Also set sqrt_price_x96 from slot0 if not already set
        if "sqrt_price_x96" not in normalized and "sqrtPriceX96" in slot0:
            normalized["sqrt_price_x96"] = slot0["sqrtPriceX96"]
    
    return normalized


def build_liquidity_response(
    chain: str,
    token_a: str,
    token_b: str,
    ethereum_result: Optional[dict] = None,
    polygon_result: Optional[dict] = None,
    hedera_result: Optional[dict] = None,
) -> dict:
    """Build liquidity response from parallel agent results."""
    results = []
    
    # Process Ethereum result
    if chain in [CHAIN_ALL, CHAIN_ETHEREUM] and ethereum_result:
        if isinstance(ethereum_result, dict):
            try:
                normalized = _normalize_result(ethereum_result)
                results.append(LiquidityResult(**normalized))
            except Exception as e:
                # If validation fails, create error result
                results.append(LiquidityResult(
                    chain="ethereum",
                    token_a=ethereum_result.get("token_a") or token_a or "unknown",
                    token_b=ethereum_result.get("token_b") or token_b or "unknown",
                    fee=ethereum_result.get("fee", 3000),
                    status="error",
                    error=f"Validation error: {str(e)}"
                ))
        elif isinstance(ethereum_result, str):
            # Try to parse if it's a JSON string
            import json
            try:
                parsed = json.loads(ethereum_result)
                if isinstance(parsed, dict):
                    normalized = _normalize_result(parsed)
                    results.append(LiquidityResult(**normalized))
            except:
                pass
    
    # Process Polygon result
    if chain in [CHAIN_ALL, CHAIN_POLYGON] and polygon_result:
        if isinstance(polygon_result, dict):
            try:
                normalized = _normalize_result(polygon_result)
                results.append(LiquidityResult(**normalized))
            except Exception as e:
                # If validation fails, create error result
                results.append(LiquidityResult(
                    chain="polygon",
                    token_a=polygon_result.get("token_a") or token_a or "unknown",
                    token_b=polygon_result.get("token_b") or token_b or "unknown",
                    fee=polygon_result.get("fee", 3000),
                    status="error",
                    error=f"Validation error: {str(e)}"
                ))
        elif isinstance(polygon_result, str):
            import json
            try:
                parsed = json.loads(polygon_result)
                if isinstance(parsed, dict):
                    normalized = _normalize_result(parsed)
                    results.append(LiquidityResult(**normalized))
            except:
                pass
    
    # Process Hedera result
    if chain in [CHAIN_ALL, CHAIN_HEDERA] and hedera_result:
        if isinstance(hedera_result, dict):
            try:
                normalized = _normalize_result(hedera_result)
                results.append(LiquidityResult(**normalized))
            except Exception as e:
                # If validation fails, create error result
                results.append(LiquidityResult(
                    chain="hedera",
                    token_a=hedera_result.get("token_a") or token_a or "unknown",
                    token_b=hedera_result.get("token_b") or token_b or "unknown",
                    fee=hedera_result.get("fee", 3000),
                    status="error",
                    error=f"Validation error: {str(e)}"
                ))
        elif isinstance(hedera_result, str):
            import json
            try:
                parsed = json.loads(hedera_result)
                if isinstance(parsed, dict):
                    normalized = _normalize_result(parsed)
                    results.append(LiquidityResult(**normalized))
            except:
                pass
    
    return StructuredLiquidity(
        chain=chain,
        token_a=token_a,
        token_b=token_b,
        results=results,
    ).model_dump()

