import { Button } from "@workspace/ui/components/button"
import { AppleIcon, GoogleIcon } from "./social-icons"

export function SocialAuthButtons() {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="lg" type="button">
        <GoogleIcon />
        Continue with Google
      </Button>
      <Button variant="outline" size="lg" type="button">
        <AppleIcon />
        Continue with Apple
      </Button>
    </div>
  )
}
