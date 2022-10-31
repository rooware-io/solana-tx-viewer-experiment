import { Cluster, PublicKey, VersionedMessage } from "@solana/web3.js";
import { InstructionLogs } from "../explorer-fork/program-logs";
import { TableCardBody } from "./TableCargBody";

export function ProgramLogsCardBody({
  message,
  logs,
  cluster,
  url,
}: {
  message: VersionedMessage;
  logs: InstructionLogs[];
  cluster: Cluster;
  url: string;
}) {
  let logIndex = 0;
  let instructionProgramIds: PublicKey[];
  //   if ("compiledInstructions" in message) {
  instructionProgramIds = message.compiledInstructions.map((ix) => {
    return message.staticAccountKeys[ix.programIdIndex];
  });
  //   } else {
  //     instructionProgramIds = message.instructions.map((ix) => ix.programId);
  //   }

  return (
    <TableCardBody>
      {instructionProgramIds.map((programId, index) => {
        const programAddress = programId.toBase58();
        let programLogs: InstructionLogs | undefined = logs[logIndex];
        if (programLogs?.invokedProgram === programAddress) {
          logIndex++;
        } else if (
          programLogs?.invokedProgram === null &&
          programLogs.logs.length > 0 //&&
          //NATIVE_PROGRAMS_MISSING_INVOKE_LOG.includes(programAddress)
        ) {
          logIndex++;
        } else {
          programLogs = undefined;
        }

        let badgeColor = "white";
        if (programLogs) {
          badgeColor = programLogs.failed ? "warning" : "success";
        }

        return (
          <tr key={index}>
            <td>
              <div>
                <span className={`badge bg-${badgeColor}-soft me-2`}>
                  #{index + 1}
                </span>
                <span className="program-log-instruction-name">
                  {/* <ProgramName
                    programId={programId}
                    cluster={cluster}
                    url={url}
                  />{" "} */}
                  Instruction
                </span>
                <span className="fe fe-chevrons-up c-pointer px-2" />
              </div>
              {programLogs && (
                <div className="d-flex align-items-start flex-column font-monospace p-2 font-size-sm">
                  {programLogs.logs.map((log, key) => {
                    return (
                      <span key={key}>
                        <span className="text-muted">{log.prefix}</span>
                        <span className={`text-${log.style}`}>{log.text}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </td>
          </tr>
        );
      })}
    </TableCardBody>
  );
}
