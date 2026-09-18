"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Check, Loader2, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { startConversation, toggleFollow } from "@/lib/actions/social";
import type { FollowTarget } from "@/lib/types";

export function FollowButton({
  targetType,
  targetId,
  initialFollowing,
  label = "Follow",
  size = "sm",
  variant,
}: {
  targetType: FollowTarget;
  targetId: string;
  initialFollowing: boolean;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  return (
    <Button
      size={size}
      variant={variant ?? (following ? "secondary" : "default")}
      disabled={pending}
      aria-pressed={following}
      onClick={() =>
        startTransition(async () => {
          setFollowing((f) => !f);
          const result = await toggleFollow(targetType, targetId, pathname);
          setFollowing(result.following);
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {following ? "Following" : label}
    </Button>
  );
}

export function MessageButton({
  userId,
  jobId,
  label = "Message",
  size = "sm",
  variant = "outline",
  disabled,
}: {
  userId: string;
  jobId?: string | null;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size={size}
      variant={variant}
      disabled={pending || disabled}
      onClick={() =>
        startTransition(async () => {
          const result = await startConversation(userId, jobId);
          if (result?.error) toast.error(result.error);
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      {label}
    </Button>
  );
}
