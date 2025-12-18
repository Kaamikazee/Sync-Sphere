declare module "howler" {
  export interface HowlOptions {
    src: string[] | string;
    volume?: number;
    loop?: boolean;
    preload?: boolean;
    html5?: boolean;
    onend?: () => void;
  }

  export class Howl {
    constructor(options: HowlOptions);
    play(): number;
    stop(): void;
    pause(): void;
    unload(): void;
    volume(volume?: number): number | void;
  }
}
