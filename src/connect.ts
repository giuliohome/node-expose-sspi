import { hexDump, trace } from './misc';
import sspi = require('../lib/sspi');
import { SSO } from './SSO';

export const connect = (userCredential: sspi.UserCredential) => {
  const errorMsg = 'error while building the security context';
  const badLoginPasswordMsg = 'sorry mate, wrong login/password.';
  try {
    const packageInfo = sspi.QuerySecurityPackageInfo('Negotiate');
    const clientCred = sspi.AcquireCredentialsHandle({
      packageName: 'Negotiate',
      authData: {
        domain: userCredential.domain,
        user: userCredential.user,
        password: userCredential.password
      }
    });
    const serverCred = sspi.AcquireCredentialsHandle({
      packageName: 'Negotiate'
    });

    let serverSecurityContext: sspi.SecurityContext;
    let clientSecurityContext: sspi.SecurityContext;
    const clientInput: sspi.InitializeSecurityContextInput = {
      credential: clientCred.credential,
      targetName: 'kiki',
      cbMaxToken: packageInfo.cbMaxToken
    };

    const serverInput: sspi.AcceptSecurityContextInput = {
      credential: serverCred.credential,
      clientSecurityContext: undefined
    };
    let i = 0;
    while (true) {
      trace('i: ', i);
      i++;

      if (serverSecurityContext) {
        clientInput.serverSecurityContext = serverSecurityContext;
        clientInput.contextHandle = clientSecurityContext.contextHandle;
      }
      clientSecurityContext = sspi.InitializeSecurityContext(clientInput);
      trace('clientSecurityContext: ', clientSecurityContext);
      trace(hexDump(clientSecurityContext.SecBufferDesc.buffers[0]));
      if (
        clientSecurityContext.SECURITY_STATUS !== 'SEC_I_CONTINUE_NEEDED' &&
        clientSecurityContext.SECURITY_STATUS !== 'SEC_E_OK'
      ) {
        throw errorMsg;
      }

      serverInput.clientSecurityContext = clientSecurityContext;
      if (serverSecurityContext) {
        serverInput.contextHandle = serverSecurityContext.contextHandle;
      }

      serverSecurityContext = sspi.AcceptSecurityContext(serverInput);
      trace('serverSecurityContext: ', serverSecurityContext);
      if (
        serverSecurityContext.SECURITY_STATUS !== 'SEC_I_CONTINUE_NEEDED' &&
        serverSecurityContext.SECURITY_STATUS !== 'SEC_E_OK'
      ) {
        if (serverSecurityContext.SECURITY_STATUS === 'SEC_E_LOGON_DENIED') {
          throw badLoginPasswordMsg;
        }
        throw errorMsg;
      }

      trace(hexDump(serverSecurityContext.SecBufferDesc.buffers[0]));
      if (serverSecurityContext.SECURITY_STATUS !== 'SEC_E_OK') {
        continue;
      }
      // we have the security context !!!
      trace('We have the security context !!!');
      break;
    }

    const sso = new SSO(serverSecurityContext.contextHandle);
    if (sso.user.name === 'Guest') {
      throw badLoginPasswordMsg;
    }
    return sso;
  } catch (e) {
    console.error('error', e);
  }

  return undefined;
};
