import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CustomerStatus } from "@workspace/document/schema"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { getErrorMessage } from "../../lib/error-formatter"
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
      toast.success("Client created successfully!")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customer-analytics"] })
      onClose()
      setName("")
      setBillingEmail("")
      setPhone("")
      setWebsite("")
      setVatNumber("")
      setAddressLine1("")
      setCity("")
      setCountry("")
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to create client"))
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            ✕
          </Button>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Company Name *
            </label>
            <Input
              type="text"
              placeholder="e.g. Acme Industries"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Billing Email
              </label>
              <Input
                type="email"
                placeholder="billing@acme.com"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Phone Number
              </label>
              <Input
                type="text"
                placeholder="+1 555 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Website Domain
              </label>
              <Input
                type="text"
                placeholder="https://acme.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                VAT / Tax ID
              </label>
              <Input
                type="text"
                placeholder="US99887766"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Initial Status
              </label>
              <Select
                value={status}
                onValueChange={(val) => val && setStatus(val as CustomerStatus)}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Preferred Currency
              </label>
              <Select
                value={preferredCurrency}
                onValueChange={(val) => val && setPreferredCurrency(val)}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Address Line
            </label>
            <Input
              type="text"
              placeholder="100 Market St, Suite 400"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                City
              </label>
              <Input
                type="text"
                placeholder="San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Country
              </label>
              <Input
                type="text"
                placeholder="United States"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={createMutation.isPending || !name.trim()}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating..." : "Save Client"}
          </Button>
        </div>
      </div>
    </div>
  )
}
