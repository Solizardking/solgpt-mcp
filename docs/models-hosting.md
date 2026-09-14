# Hosting SOL-GPT Trading Factory

The web app already has a Fly.io deployment definition (`fly.toml`, app `solgpt`,
region `iad`) and a standalone Next.js Docker image. `/models` ships with the
web app. Keep model inference in a separate process/service with its own memory
budget and persistent model cache. The inference app is `solgpt-trading-factory` in the current Fly `personal` organization.

## Fly deployment

Deployment source: `deploy/trading-factory/`. The model runs on one performance
machine (4 CPUs, 16 GB RAM) in `iad`, with a 10 GB persistent volume. It has no
public service; SOL-GPT connects over Fly private IPv6 networking.

```dotenv
SOLGPT_INFERENCE_BASE_URL=http://solgpt-trading-factory.internal:8080/v1
SOLGPT_INFERENCE_MODEL=solana-nvidia-trading-factory-8
```

The server alias is deliberately `solana-nvidia-trading-factory-8`, as requested.
The underlying weights and picker label are still 8B. The model server's
`LLAMA_API_KEY` and web app's `SOLGPT_INFERENCE_API_KEY` are matching Fly secrets.
The launcher pins the Hugging Face revision and checks the download SHA-256.

```sh
cd deploy/trading-factory
fly deploy --remote-only --ha=false --wait-timeout 10m
```

The first boot downloads about 4.9 GB. Follow `fly logs -a solgpt-trading-factory`
and verify `/health` and an authenticated completion from within the Fly network
before treating the host as ready. This CPU configuration is a starting point;
measure latency before expanding concurrency.

## Verified model artifacts (2026-09-06)

- [Dataset](https://huggingface.co/datasets/solanaclawd/solana-clawd-nvidia-trading-factory-instruct): instruction data, not an inference endpoint.
- [LoRA](https://huggingface.co/solanaclawd/solana-nvidia-trading-factory-8b-lora): adapter base is `NousResearch/Hermes-3-Llama-3.1-8B`, rank 32, alpha 64 (from `adapter_config.json`). The base weights are required.
- [GGUF](https://huggingface.co/solanaclawd/solana-nvidia-trading-factory-8b-GGUF): `solana-trading-factory-8b-Q4_K_M.gguf` and `solana-trading-factory-8b-Q5_K_M.gguf`. The repository has no README at verification time. Its API metadata reports llama architecture and a ChatML template.

## First working host: llama.cpp GGUF

Install a recent [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md).
Start with Q4_K_M; reserve memory beyond the weights for the context cache and
runtime. Benchmark your actual machine before selecting production capacity.
The following is a launch recipe, not a claim of measured throughput:

```sh
llama-server \
  --hf-repo solanaclawd/solana-nvidia-trading-factory-8b-GGUF \
  --hf-file solana-trading-factory-8b-Q4_K_M.gguf \
  --alias solana-nvidia-trading-factory-8b \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 8192 --parallel 1 --jinja
```

For the web app on the same machine, add to `.env.local`:

```dotenv
SOLGPT_INFERENCE_BASE_URL=http://127.0.0.1:8080/v1
SOLGPT_INFERENCE_MODEL=solana-nvidia-trading-factory-8b
```

Restart the app, select **SOL-GPT Trading Factory 8B**, and send a short prompt.
Existing desk access requirements apply. The default public model is unchanged.
The provider uses `/v1/chat/completions` through the existing streaming chat path.
It is text-only until tool serialization is verified; it does not execute trades.

For production, bind the model server to the interface reachable by the web
service, configure llama.cpp authentication with `LLAMA_API_KEY`, and set the same
value as the web server's `SOLGPT_INFERENCE_API_KEY`. Use an HTTPS inference API
root, or an authenticated Fly private address such as
`http://YOUR_INFERENCE_APP.internal:8080/v1`. Bind IPv6 (`--host ::`) for Fly's
private network. Use persistent storage for the HF model cache. Do not expose an
unauthenticated model server publicly. `SOLGPT_INFERENCE_BASE_URL` must end in
`/v1`; never point it back at the web app's chat route.

These are server-only variables; do not prefix them with `NEXT_PUBLIC_`.
`SOLGPT_API_KEY` remains the existing OpenRouter credential and is not reused.

## GPU alternative: LoRA with vLLM

Use the exact base above and download the adapter to a local directory with the
Hugging Face CLI. With a compatible vLLM installation and sufficient GPU memory:

```sh
hf download solanaclawd/solana-nvidia-trading-factory-8b-lora \
  --local-dir ./trading-factory-lora
vllm serve NousResearch/Hermes-3-Llama-3.1-8B \
  --enable-lora --max-lora-rank 32 \
  --lora-modules solana-nvidia-trading-factory-8b=./trading-factory-lora \
  --host 127.0.0.1 --port 8080 --max-model-len 8192
```

Verify adapter/runtime compatibility and generated outputs before production.
Apply server authentication and TLS/private networking as above; vLLM uses its own
API-key setting. See [vLLM LoRA serving](https://docs.vllm.ai/en/latest/features/lora/).
The GGUF route is the simpler initial setup because it avoids loading a separate adapter.

## Verify before switching traffic

1. Check `GET /health` on llama.cpp, then `GET /v1/models` with the server bearer key if enabled.
2. Send a non-streaming and streaming request to `/v1/chat/completions` with model `solana-nvidia-trading-factory-8b`.
3. Check SOL-GPT's `/api/inference` includes provider `solgpt` and the desk model `solgpt/solana-nvidia-trading-factory-8b`.
4. Test the desk model with an authorized session and check latency, context usage, and memory under expected concurrency.
5. Deploy the web changes through the existing Fly workflow (`npm run fly:deploy`) after configuring the inference host. This does not deploy the model weights or provision inference automatically.

The upstream model alias can be changed using `SOLGPT_INFERENCE_MODEL`; the stable
picker ID stays `solgpt/solana-nvidia-trading-factory-8b`. The configured base URL
and upstream token never appear in the public inference catalog.

## Full model catalog

`/models` uses the committed metadata snapshot in `src/lib/solgpt/model-catalog.json`.
It includes public model repositories, datasets, Spaces, and storage buckets from
`solanaclawd` and `ordlibrary`, plus configurations and selected model artifacts
from the Solana Clawd training project. The catalog groups quantizations and
shards under their source; counts are sources, not distinct trained models.

Refresh public metadata and the local inventory with:

```sh
node scripts/sync-model-catalog.mjs --training-root /path/to/solana-clawd-ai-training
```

Without `--training-root`, the script refreshes public Hugging Face metadata and
preserves the prior local inventory and its inspection date. The sync follows
Hub pagination, fails before replacing the snapshot if an API request fails,
and uses no authentication. It reads only selected configuration fields,
Modelfile base identities, and artifact filenames from the local project.
It never uploads weights or scans virtual environments, caches, credentials,
or training-data contents. Local models without a verified public repository
have no invented download link.

The page distinguishes published weights, local artifacts, recipes, and
repositories without weights. The hosted Trading Factory provider remains a
separate integration: adding an entry to this catalog does not add a working
inference endpoint or a desk picker option. Local LTX and Qwen components retain
their upstream identity; repository or bucket names do not prove model lineage.

Validation:

```sh
node --test scripts/sync-model-catalog.test.mjs
npx vitest run src/lib/solgpt/model-catalog.test.ts
```
