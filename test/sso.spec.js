const assert = require('assert');
const os = require('os');
const { sso, sysinfo } = require('node-expose-sspi');

describe('SSO Unit Test', function() {
  it('should test getDefaultDomain', function() {
    const defaultDomain = sso.getDefaultDomain();
    const domain = sysinfo.GetComputerNameEx('ComputerNameDnsDomain');
    if (domain.length === 0) {
      const hostname = os.hostname();
      assert(
        defaultDomain.toLocaleUpperCase() === hostname.toLocaleUpperCase()
      );
      return;
    }
    assert(domain.length > 0);
  });
});
