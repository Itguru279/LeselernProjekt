// Einstellungen über Umgebungsvariablen (siehe README).

export interface Config {
  port: number;
  dataDir: string;
  timeZone: string;
  adminName: string;
  adminPassword: string | undefined;
  childName: string;
  childCode: string; // z. B. "hund,katze,frosch"
  startLetters: string[];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 8080),
    dataDir: env.DATA_DIR ?? './data',
    timeZone: env.TZ_APP ?? env.TZ ?? 'Europe/Berlin',
    adminName: env.ADMIN_NAME ?? 'Admin',
    adminPassword: env.ADMIN_PASSWORD || undefined,
    childName: env.CHILD_NAME ?? 'Ben',
    childCode: env.CHILD_CODE ?? 'hund,katze,frosch',
    startLetters: (env.START_LETTERS ?? 'a,m,l,o,i,e')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
}
