import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"
import { useState } from "react"

type Provider = {
  id: string
  name: string
  isActive: boolean
  apiKeySet: boolean
  maskedApiKey: string | null
  baseUrl: string
  defaultModel: string
}
type Settings = {
  providers: Provider[]
  activeProvider: Provider | null
  fallback: Omit<Provider, "id" | "name" | "isActive"> & { source: string }
}
const url = () =>
  import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"
const request = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${url()}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok)
    throw new Error(
      (await res.json().catch(() => null))?.message || "Request failed"
    )
  return res.json()
}

export function AISettingsPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Provider | null>(null)
  const [adding, setAdding] = useState(false)
  const query = useQuery({
    queryKey: ["agent", "settings", "ai"],
    queryFn: () => request("/api/agent/settings/ai") as Promise<Settings>,
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["agent", "settings", "ai"] })
    qc.invalidateQueries({ queryKey: ["agent", "models"] })
  }
  const mutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id?: string
      body: Record<string, unknown>
    }) =>
      request(`/api/agent/settings/ai${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) =>
      request(`/api/agent/settings/ai/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  })
  if (query.isLoading)
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    )
  if (query.isError)
    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>Failed to load AI settings</CardTitle>
          <CardDescription>{(query.error as Error).message}</CardDescription>
        </CardHeader>
      </Card>
    )
  const data = query.data!
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">AI Provider Configuration</h2>
          <p className="text-muted-foreground text-sm">
            Configure multiple OpenAI-compatible providers and choose which one
            powers the agent.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>Add Provider</Button>
      </div>
      {data.providers.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Environment defaults</CardTitle>
            <CardDescription>
              No custom providers configured. The agent is using environment
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-3">
            <Value label="Endpoint" value={data.fallback.baseUrl} />
            <Value label="Model" value={data.fallback.defaultModel} />
            <Value
              label="API key"
              value={data.fallback.maskedApiKey || "None"}
            />
          </CardContent>
        </Card>
      )}
      {data.providers.map((provider) => (
        <Card key={provider.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{provider.name}</CardTitle>
                <CardDescription>{provider.baseUrl}</CardDescription>
              </div>
              <Badge variant={provider.isActive ? "default" : "secondary"}>
                {provider.isActive ? "Active" : "Available"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <Value label="API key" value={provider.maskedApiKey || "None"} />
              <Value label="Default model" value={provider.defaultModel} />
              <Value label="Endpoint" value={provider.baseUrl} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              {!provider.isActive && (
                <Button
                  variant="outline"
                  onClick={() =>
                    mutation.mutate({
                      id: provider.id,
                      body: { isActive: true },
                    })
                  }
                >
                  Use provider
                </Button>
              )}
              <Button variant="outline" onClick={() => setEditing(provider)}>
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  confirm(`Delete ${provider.name}?`) &&
                  remove.mutate(provider.id)
                }
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {(adding || editing) && (
        <ProviderForm
          provider={editing}
          pending={mutation.isPending}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
          onSave={(body) => {
            mutation.mutate({ id: editing?.id, body })
            setAdding(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
function Value({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-medium text-muted-foreground">{label}</span>
      <span className="break-all font-mono">{value}</span>
    </div>
  )
}
function ProviderForm({
  provider,
  pending,
  onClose,
  onSave,
}: {
  provider: Provider | null
  pending: boolean
  onClose: () => void
  onSave: (body: Record<string, unknown>) => void
}) {
  const [name, setName] = useState(provider?.name || "")
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || "")
  const [apiKey, setApiKey] = useState("")
  const [defaultModel, setDefaultModel] = useState(provider?.defaultModel || "")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{provider ? "Edit provider" : "Add provider"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Name"
            value={name}
            setValue={setName}
            placeholder="OpenRouter"
          />
          <Field
            label="API endpoint"
            value={baseUrl}
            setValue={setBaseUrl}
            placeholder="https://openrouter.ai/api/v1"
          />
          <Field
            label="API key"
            value={apiKey}
            setValue={setApiKey}
            placeholder={
              provider?.maskedApiKey
                ? `Keep current (${provider.maskedApiKey})`
                : "Enter API key"
            }
            type="password"
          />
          <Field
            label="Default model"
            value={defaultModel}
            setValue={setDefaultModel}
            placeholder="anthropic/claude-sonnet-4"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={pending || !name.trim()}
              onClick={() =>
                onSave({
                  name: name.trim(),
                  baseUrl: baseUrl || null,
                  ...(apiKey ? { apiKey } : {}),
                  defaultModel: defaultModel || null,
                })
              }
            >
              {pending && <Spinner className="mr-2" />}Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
function Field({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  setValue: (v: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}
