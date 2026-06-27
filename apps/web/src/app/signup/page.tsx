"use client";
// Import React Hooks
import { useQuery } from "@tanstack/react-query";
// Import trpc
import { trpc } from "@/utils/trpc";
// Import next functions
import { redirect } from "next/navigation";
// Import own components
import Loader from "@/components/loader";
import SignUpForm from "@/components/sign-up-form";

import { hasPermission } from "@crm-fran/api/permissions";



export default function SignUpPage() {
  const { data, isPending, isError, error } = useQuery(
    trpc.createUser.queryOptions(),
  );

  if (isPending) {
    return <Loader />;
  }

  if (!hasPermission(data?.permission || [], ["users:create"])) {
    redirect("/login");
  }

  return (
    <SignUpForm />
  );
}

