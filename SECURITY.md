# Security

ESRAND is a deterministic, non-cryptographic PRNG library.

## Supported versions

Security fixes are applied to the latest tagged release.

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** / private security-advisory flow for
this repository rather than opening a public issue with exploit details.

## Security boundary

ESRAND does not claim cryptographic unpredictability. Predictable seeded output,
state cloning, state restoration, and jump/split reproducibility are intentional
features, not vulnerabilities.

Do not use ESRAND for passwords, authentication/session tokens, cryptographic
keys, security nonces, adversarial lotteries, or financial/security decisions
that require a CSPRNG.

Reports are welcome for issues such as unexpected code execution, unsafe global
mutation, release-artifact tampering, dependency compromise, or behavior that
violates the documented deterministic contract.
