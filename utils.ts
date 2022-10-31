import * as math from "mathjs";

// shorten the checksummed version of the input address to have 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatAmountToUiAmount(
  amount: BigInt,
  decimals: number
): string {
  const uiAmount = math
    .bignumber(amount.toString())
    .div(Math.pow(10, decimals))
    .toString();

  return uiAmount;
}
