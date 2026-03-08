export const idlFactory = ({ IDL }) => {
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
export const init = ({ IDL }) => { return []; };
