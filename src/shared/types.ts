export type LocalMode = "auto" | "force" | "off";

export interface ParsedCliOptions {
  readonly projectPath: string;
  readonly imageRef: string;
  readonly shellMode: boolean;
  readonly hostDockerMode: boolean;
  readonly passthroughCommand: readonly string[];
  readonly helpRequested: boolean;
}

export interface CacheCtrlLocalState {
  readonly active: boolean;
  readonly projectRoot: string;
  readonly binaryTarget: string;
}

export interface DockerRuntimePlan {
  readonly imageRef: string;
  readonly dockerRunArgs: readonly string[];
  readonly commandToRun: readonly string[];
}

export interface RuntimeContext {
  readonly resolvedProjectPath: string;
  readonly hostConfigDirectoryPath: string;
  readonly hostStateDirectoryPath: string;
  readonly hostShareDirectoryPath: string;
  readonly hostLaBriguadeConfigDirectoryPath: string;
  readonly laBriguadeLocalMode: LocalMode;
  readonly laBriguadeLocalPath: string;
  readonly cacheCtrlLocalMode: LocalMode;
  readonly cacheCtrlLocalPath: string;
  readonly cacheCtrlHostBinaryEntryPath: string;
  readonly cacheCtrlHostSkillEntryPath: string;
  readonly hostUid: number;
  readonly hostGid: number;
  readonly isWindows: boolean;
}
