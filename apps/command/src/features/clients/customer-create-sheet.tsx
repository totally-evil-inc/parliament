import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CustomerStatus } from "@workspace/document/schema"
import { createCustomerServerFn } from "../../server/customers"

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function CustomerCreateSheet({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [billingEmail, setBillingEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [vatNumber, setVatNumber] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [status, setStatus] = useState<CustomerStatus>("active")
  const [preferredCurrency, setPreferredCurrency] = useState("USD")

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) return
      return await createCustomerServerFn({
        data: {
          name: name.trim(),
          billingEmail: billingEmail.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          vatNumber: vatNumber.trim() || undefined,
          addressLine1: addressLine1.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          status,
          preferredCurrency,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customer-analytics"] })
      onClose()
      // reset form
      setName("")
      setBillingEmail("")
      setPhone("")
      setWebsite("")
      setVatNumber("")
      setAddressLine1("")
      setCity("")
      setCountry("")
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col p-6 overflow-y-auto gap-6 animate-in slide-in-from-right">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Add New Client</h2>
            <p className="text-xs text-muted-foreground">
              Register a customer profile for billing, proposals, and deals.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Company Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Industries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Billing Email
              </label>
              <input
                type="email"
                placeholder="billing@acme.com"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+1 555 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Website Domain
              </label>
              <input
                type="text"
                placeholder="https://acme.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                VAT / Tax ID
              </label>
              <input
                type="text"
                placeholder="US99887766"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="lead">Lead</option>
                <option value="inactive">Inactive</option>
                <option value="churned">Churned</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Preferred Currency
              </label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Address Line
            </label>
            <input
              type="text"
              placeholder="100 Market St, Suite 400"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                City
              </label>
              <input
                type="text"
                placeholder="San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Country
              </label>
              <input
                type="text"
                placeholder="United States"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={createMutation.isPending || !name.trim()}
            onClick={() => createMutation.mutate()}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? "Creating..." : "Save Client"}
          </button>
        </div>
      </div>
    </div>
  )
}
