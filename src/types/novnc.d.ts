declare module "@novnc/novnc/core/rfb.js" {
  interface RFBOptions {
    shared?: boolean;
    credentials?: { username?: string; password?: string; target?: string };
    wsProtocols?: string[];
  }

  interface DisconnectDetail {
    clean: boolean;
  }

  interface SecurityFailureDetail {
    status: number;
    reason: string;
  }

  class RFB extends EventTarget {
    constructor(target: HTMLElement, urlOrChannel: string | WebSocket, options?: RFBOptions);

    scaleViewport: boolean;
    resizeSession: boolean;
    viewOnly: boolean;
    focusOnClick: boolean;
    clipViewport: boolean;
    showDotCursor: boolean;
    qualityLevel: number;
    compressionLevel: number;

    disconnect(): void;
    sendCtrlAltDel(): void;
    sendKey(keysym: number, code: string | null, down?: boolean): void;
    focus(): void;
    blur(): void;
    machineShutdown(): void;
    machineReboot(): void;
    machineReset(): void;
    clipboardPasteFrom(text: string): void;
  }

  export default RFB;
}
