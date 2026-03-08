import { Actor, type ActorConfig, type ActorMethod, type HttpAgent } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { HttpAgentOptions } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export type UserRole = { admin: null } | { user: null } | { guest: null };

export interface backendInterface {
  _initializeAccessControlWithSecret: ActorMethod<[string], undefined>;
  getCallerUserRole: ActorMethod<[], UserRole>;
  assignCallerUserRole: ActorMethod<[Principal, UserRole], undefined>;
  isCallerAdmin: ActorMethod<[], boolean>;
  ping: ActorMethod<[], string>;
}

export interface CreateActorOptions {
  agentOptions?: HttpAgentOptions;
  agent?: HttpAgent;
  processError?: (error: unknown) => never;
}

export class ExternalBlob {
  private url = '';
  private progressCb: ((p: number) => void) | undefined = undefined;

  static fromURL(url: string): ExternalBlob {
    const b = new ExternalBlob();
    b.url = url;
    return b;
  }

  get onProgress(): ((p: number) => void) | undefined {
    return this.progressCb;
  }

  set onProgress(cb: ((p: number) => void) | undefined) {
    this.progressCb = cb;
  }

  async getBytes(): Promise<Uint8Array> {
    const resp = await fetch(this.url);
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  }
}

export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }): import('@dfinity/candid').IDL.ServiceClass => {
  const UserRole = IDL.Variant({
    admin: IDL.Null,
    user: IDL.Null,
    guest: IDL.Null,
  });
  return IDL.Service({
    '_initializeAccessControlWithSecret': IDL.Func([IDL.Text], [], []),
    'getCallerUserRole': IDL.Func([], [UserRole], ['query']),
    'assignCallerUserRole': IDL.Func([IDL.Principal, UserRole], [], []),
    'isCallerAdmin': IDL.Func([], [IDL.Bool], ['query']),
    'ping': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const init = ({ IDL: _IDL }: { IDL: typeof import('@dfinity/candid').IDL }): import('@dfinity/candid').IDL.Type[] => {
  return [];
};

export async function createActor(
  canisterId: string,
  _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile: (bytes: Uint8Array) => Promise<ExternalBlob>,
  options?: CreateActorOptions & { agent?: HttpAgent },
): Promise<backendInterface> {
  const actorConfig: ActorConfig = {
    canisterId,
    agent: options?.agent,
  };
  return Actor.createActor<backendInterface>(idlFactory as Parameters<typeof Actor.createActor>[0], actorConfig);
}
