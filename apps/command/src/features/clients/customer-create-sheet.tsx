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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { toast } from "@workspace/ui/components/sonner"
import { useState } from "react"
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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-lg gap-6 overflow-y-auto border-border border-l bg-card p-6 shadow-2xl sm:max-w-lg"
      >
        <SheetHeader className="border-border border-b p-0 pb-4">
          <div>
            <SheetTitle className="font-bold text-foreground text-lg">
              Add New Client
            </SheetTitle>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Register a customer profile for billing, proposals, and deals.
            </p>
          </div>
        </SheetHeader>

        <div className="my-2 flex flex-1 flex-col gap-4">
          <div>
            <label className="mb-1 block font-medium text-muted-foreground text-xs">
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
              <label className="mb-1 block font-medium text-muted-foreground text-xs">
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
              <label className="mb-1 block font-medium text-muted-foreground text-xs">
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
              <label className="mb-1 block font-medium text-muted-foreground text-xs">
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
              <label className="mb-1 block font-medium text-muted-foreground text-xs">
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
              <label className="mb-1 block font-medium text-muted-foreground text-xs">
                Initial Status
              </label>
              <Select
                value={status}
                onValueChange={(val) => val && setStatus(val as CustomerStatus)}
              >
                <SelectTrigger className="h-8 w-full">
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
              <label className="mb-1 block font-medium text-muted-foreground text-xs">
                Preferred Currency
              </label>
              <Select
                value={preferredCurrency}
                onValueChange={(val) => val && setPreferredCurrency(val)}
              >
                <SelectTrigger className="h-8 w-full">
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
            <label className="mb-1 block font-medium text-muted-foreground text-xs">
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
              <label className="mb-1 block font-medium text-muted-foreground text-xs">
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
              <label className="mb-1 block font-medium text-muted-foreground text-xs">
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

        <div className="mt-auto flex items-center justify-end gap-3 border-border border-t pt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
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
      </SheetContent>
    </Sheet>
  )
}
