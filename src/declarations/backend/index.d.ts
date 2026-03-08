import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type UserRole = { 'admin': null } | { 'user': null } | { 'guest': null };

export interface _SERVICE {
  '_initializeAccessControlWithSecret': ActorMethod<[string], undefined>;
  'getCallerUserRole': ActorMethod<[], UserRole>;
  'assignCallerUserRole': ActorMethod<[Principal, UserRole], undefined>;
  'isCallerAdmin': ActorMethod<[], boolean>;
  'ping': ActorMethod<[], string>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
