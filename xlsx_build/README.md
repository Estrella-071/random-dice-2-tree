# Optional internal artifact helpers

`xlsx_build/` is not required to build, validate, test, or deploy the website. The current helper may depend on private tooling and ignored research inputs; it is intentionally outside the clean-clone public path.

Do not add this directory to Pages staging or claim that it is reproducible from the public repository. If the helper becomes a supported public workflow, add a package/dependency lock, input/output contract, provenance record, and CI job before documenting it as required.
