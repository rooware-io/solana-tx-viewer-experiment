import {
  DecodedTransferInstruction,
  decodeInstruction,
  isTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  TokenBalance,
  TransactionInstruction,
  TransactionMessage,
} from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProgramLogsCardBody } from "../../components/ProgramLogsCardBody";
import { decompileCompiledIx } from "../../decoder/compiled-ix-decoder";
import {
  asHighLevelTransactionInstruction,
  HighLevelTransactionInstruction,
} from "../../decoder/ix-decoder";
import { parseProgramLogs } from "../../explorer-fork/program-logs";
import { Cluster, getProgramName } from "../../explorer-fork/tx";
import styles from "../../styles/Home.module.css";
import { formatAmountToUiAmount, shortenAddress } from "../../utils";

const connection = new Connection("https://api.mainnet-beta.solana.com");

// Concept:
// get to TransactionInstruction, get TransactionInstruction from innerInstructions as well
// Rebuild depth with logs

const MINT_TO_SYMBOL: Record<string, string> = {
  So11111111111111111111111111111111111111112: "wSOL",
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: "mSOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
};

type TransactionInstructionViewProps = {
  index: number;
  instruction: TransactionInstruction;
  innerInstructions?: {
    instruction: TransactionInstruction;
    stackHeight: number;
  }[];
  stackHeight?: number;
  getPublicKeyName: (pk: PublicKey) => string;
};

function HighLevelTransactionIxView({
  highLevelTransactionIx,
  getPublicKeyName,
}: {
  highLevelTransactionIx: HighLevelTransactionInstruction;
  getPublicKeyName: (pk: PublicKey) => string;
}) {
  const allArgsFormatted = highLevelTransactionIx.args
    .map(({ name, value }) => `${name}=${value}`)
    .concat(
      highLevelTransactionIx.aois.map(
        ({ name, account }) => `${name}=${getPublicKeyName(account)}`
      )
    );

  return (
    <span>
      [{highLevelTransactionIx.program}].{highLevelTransactionIx.method}(
      {allArgsFormatted.join(",  ")})
    </span>
  );
}

function TransactionInstructionView({
  index,
  instruction,
  innerInstructions,
  stackHeight,
  getPublicKeyName,
}: TransactionInstructionViewProps) {
  const highlevelTransactionIx = asHighLevelTransactionInstruction(instruction);
  const programName = getProgramName(
    instruction.programId.toBase58(),
    Cluster.MainnetBeta
  );
  return (
    <div style={{ marginLeft: stackHeight ? `${2 * stackHeight}em` : "" }}>
      {highlevelTransactionIx ? (
        <HighLevelTransactionIxView
          highLevelTransactionIx={highlevelTransactionIx}
          getPublicKeyName={getPublicKeyName}
        />
      ) : (
        <div>
          [{programName}
          ].unknown(ixData={`0x${instruction.data.toString("hex")}`})
        </div>
      )}
      <div>
        {innerInstructions?.map(({ instruction, stackHeight }, index) => (
          <TransactionInstructionView
            key={index}
            index={0}
            instruction={instruction}
            stackHeight={stackHeight}
            getPublicKeyName={getPublicKeyName}
          />
        ))}
      </div>
    </div>
  );
}

const DEFAULT_TX_ID =
  "3KktLw5mbmiVW7733zpAy5sVZg8EA6oDZ6nRWSWSPqDh3zDr7tzuCT6gxHj9vDh2jJHdXtMnex2sstnwdh1xvGFA";

export default function Transaction() {
  const router = useRouter();
  const [txId, setTxId] = useState<string>();

  useEffect(() => {
    const queryTxId = router.query.txId as string;
    setTxId(queryTxId);
  }, [router.query]);

  const { data: versionedTransactionResponse } = useQuery(
    ["tx", txId],
    async () => {
      if (!txId) return;
      const tx = connection.getTransaction(txId, {
        maxSupportedTransactionVersion: 0,
      });
      return tx;
    }
  );

  const transactionMessage = useMemo(() => {
    if (versionedTransactionResponse) {
      const { meta, transaction } = versionedTransactionResponse;
      const transactionMessage = TransactionMessage.decompile(
        transaction.message,
        meta?.loadedAddresses
          ? { accountKeysFromLookups: meta.loadedAddresses }
          : undefined
      );
      return transactionMessage;
    }
  }, [versionedTransactionResponse]);

  const feePayer = useMemo(
    () =>
      versionedTransactionResponse?.transaction.message.staticAccountKeys[0],
    [versionedTransactionResponse]
  );

  // TODO: Use the tokenMap
  const getPublicKeyName = useCallback(
    (pk: PublicKey | string): string => {
      const pkBase58 = typeof pk === "string" ? pk : pk.toBase58();
      if (feePayer?.toBase58() === pkBase58) {
        return "[feePayer]";
      } else if (MINT_TO_SYMBOL[pkBase58]) {
        return `[${MINT_TO_SYMBOL[pkBase58]}]`;
      }
      return shortenAddress(pkBase58);
    },
    [feePayer]
  );

  const innerTransactionInstructions = useMemo(() => {
    if (!versionedTransactionResponse?.meta) return;
    const { meta } = versionedTransactionResponse;
    const message = versionedTransactionResponse.transaction.message;
    const accountKeys = message.getAccountKeys(
      meta?.loadedAddresses
        ? { accountKeysFromLookups: meta.loadedAddresses }
        : undefined
    );

    return versionedTransactionResponse.meta.innerInstructions?.map(
      (innerIx) => {
        const instructions = innerIx.instructions.map((compileInstruction) =>
          decompileCompiledIx(compileInstruction, message, accountKeys)
        );
        return { index: innerIx.index, instructions };
      }
    );
  }, [versionedTransactionResponse]);

  const programLogsResult = useMemo(() => {
    if (!versionedTransactionResponse) return;
    return parseProgramLogs(
      versionedTransactionResponse.meta?.logMessages ?? [],
      versionedTransactionResponse.meta?.err ?? null,
      "mainnet-beta"
    );
  }, [versionedTransactionResponse]);

  // HACK: Find stackHeight from the logs
  const innerTransactionInstructionWithStackHeights = useMemo(() => {
    if (!innerTransactionInstructions || !programLogsResult) return;

    const stackHeights =
      programLogsResult.innerInstructionsStackHeights.slice();
    return innerTransactionInstructions?.map((innerTransactionInstruction) => ({
      index: innerTransactionInstruction.index,
      instructionWithStackHeights: innerTransactionInstruction.instructions.map(
        (ix) => {
          const stackHeight = stackHeights.shift();
          if (!stackHeight)
            throw new Error(
              "Failed to match stack height, ran out of elements"
            );
          return {
            instruction: ix,
            stackHeight,
          };
        }
      ),
    }));
  }, [innerTransactionInstructions, programLogsResult]);

  // Since the tokens need to end up somewhere, it should always be possible to match back the mint from the final postTokenBalances
  // Incorrect right now has it doesn't handle any edge case
  const assetTransfers = useMemo(() => {
    if (!versionedTransactionResponse?.meta || !innerTransactionInstructions)
      return;

    const { meta } = versionedTransactionResponse;
    const message = versionedTransactionResponse.transaction.message;
    const accountKeys = message.getAccountKeys(
      meta?.loadedAddresses
        ? { accountKeysFromLookups: meta.loadedAddresses }
        : undefined
    );
    const tokenAccountToTokenBalance = meta.postTokenBalances?.reduce(
      (acc, tokenBalance) => {
        const tokenAccount = accountKeys.get(tokenBalance.accountIndex);
        if (tokenAccount) {
          acc.set(tokenAccount.toBase58(), tokenBalance);
        }
        return acc;
      },
      new Map<string, TokenBalance>()
    );

    return transactionMessage?.instructions
      .map((instruction, topLevelIndex) => {
        const innerIxs = innerTransactionInstructions.find(
          ({ index }) => index === topLevelIndex
        )?.instructions;
        return [instruction, ...(innerIxs ?? [])].reduce<
          {
            decodedIx: DecodedTransferInstruction;
            tokenBalance: TokenBalance | undefined;
            to: string | undefined;
          }[]
        >((acc, ix) => {
          if (!ix.programId.equals(TOKEN_PROGRAM_ID)) return acc;
          const decodedIx = decodeInstruction(ix);
          if (isTransferInstruction(decodedIx)) {
            acc.push({
              decodedIx,
              tokenBalance: tokenAccountToTokenBalance?.get(
                decodedIx.keys.destination.pubkey.toBase58()
              ),
              to: tokenAccountToTokenBalance?.get(
                decodedIx.keys.destination.pubkey.toBase58()
              )?.owner,
            });
          }
          return acc;
        }, []);
      })
      .flat();
  }, [
    versionedTransactionResponse,
    transactionMessage,
    innerTransactionInstructions,
  ]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div style={{ width: "100%" }}>
          <label>Signature</label>
          <input
            style={{ width: "100%" }}
            value={txId}
            onChange={(e) => {
              setTxId(e.target.value);
              router.replace(
                {
                  pathname: router.pathname,
                  query: {
                    txId,
                  },
                },
                undefined,
                { shallow: true }
              );
            }}
          />
        </div>
        <div>feePayer {transactionMessage?.payerKey.toBase58()}</div>
        <div>
          <p>Token transfers</p>
          {assetTransfers?.map((assetTransfer, index) => {
            const tokenBalance = assetTransfer.tokenBalance;
            const amount = assetTransfer.decodedIx.data.amount;
            const owner = assetTransfer.decodedIx.keys.owner.pubkey;
            const formattedUiAmount = tokenBalance
              ? formatAmountToUiAmount(
                  amount,
                  tokenBalance.uiTokenAmount.decimals
                )
              : `${amount.toString()} raw`;
            const mint = assetTransfer.tokenBalance?.mint;

            return (
              <div key={index}>
                Transfer {formattedUiAmount}{" "}
                {mint ? getPublicKeyName(mint) : "?"} from{" "}
                {getPublicKeyName(owner)} to{" "}
                {getPublicKeyName(
                  assetTransfer.to ??
                    assetTransfer.decodedIx.keys.destination.pubkey
                )}
              </div>
            );
          })}
        </div>
        <div>
          <p>Instructions</p>
          {transactionMessage?.instructions.map(
            (instruction, topLevelIndex) => (
              <TransactionInstructionView
                key={topLevelIndex}
                index={topLevelIndex}
                instruction={instruction}
                innerInstructions={
                  innerTransactionInstructionWithStackHeights?.find(
                    ({ index }) => index === topLevelIndex
                  )?.instructionWithStackHeights
                }
                getPublicKeyName={getPublicKeyName}
              />
            )
          )}
        </div>

        {/* {versionedTransactionResponse?.transaction.message && programLogs && (
          <ProgramLogsCardBody
            message={versionedTransactionResponse.transaction.message}
            logs={programLogs}
            cluster={"mainnet-beta"}
            url=""
          />
        )} */}
      </main>

      <footer className={styles.footer}></footer>
    </div>
  );
}
