# SOL-GPT container registry

This checkout links to Vercel project `clawd-c4b28c7e/sol-gpt`. Its container
repository is `vcr.vercel.com/clawd-c4b28c7e/sol-gpt/solgpt`.

On this Mac, start Docker Desktop and select its context. A `DOCKER_HOST`
environment variable overrides the selected context, so clear any old Colima
override in an already-open terminal:

```sh
unset DOCKER_HOST
docker context use desktop-linux
docker info
```

Verify access and authenticate the container tool:

```sh
vercel whoami
vercel project inspect sol-gpt --scope clawd-c4b28c7e
DOCKER_CONTEXT=desktop-linux vercel vcr login docker --scope clawd-c4b28c7e
```

If the checkout is not linked, run this as a single command:

```sh
vercel link --project sol-gpt --scope clawd-c4b28c7e
```

Build and push from the repository root. On this Apple Silicon Mac, use the
native `linux/arm64` target. The default AMD64 build crashed in QEMU during
Next.js compilation, including with the existing `NEXT_SWC_WASM=1` build arg:

```sh
DOCKER_CONTEXT=desktop-linux vercel vcr build docker . solgpt:latest --platform linux/arm64 --push --scope clawd-c4b28c7e
```

For an AMD64 runtime, build `--platform linux/amd64` on a native AMD64 builder
and use a separate tag. The build requires
the existing Clawd Bot package in `data/` and the installer matching
`public/downloads/manifest.json`. Credentials expire after about 12 hours;
rerun the login command when needed.

Verify the uploaded tag and pull it:

```sh
vercel vcr tag inspect solgpt latest --scope clawd-c4b28c7e
docker --context desktop-linux pull --platform linux/arm64 vcr.vercel.com/clawd-c4b28c7e/sol-gpt/solgpt:latest
```

Pushing stores the image in VCR. Deploying it to a runtime is a separate step.
The existing image starts the standalone Next.js server on port 3000 and
requires application credentials at runtime for full readiness.
