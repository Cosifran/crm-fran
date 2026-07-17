// Import trpc
import { trpc } from "@/utils/trpc";

// Import React Hooks
import { toast } from "sonner";
import Loader from "@/components/loader";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@crm-fran/ui/components/button";

export default function AssignLeadButton({
  children,
  leadId,
  closeDialog,
}: {
  children: React.ReactNode;
  leadId: string;
  closeDialog: () => void;
}) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation(
    trpc.leads.assignLeadToCaller.mutationOptions(),
  );

  const assignLeadFn = () => {
    mutate(
      { id: leadId },
      {
        onSuccess: () => {
          toast.success("Lead asignado correctamente");
          queryClient.invalidateQueries({
            queryKey: trpc.leads.listAll.queryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.leads.listWithoutAssigned.queryKey(),
          });
          closeDialog();
        },
        onError: (error) => {
          toast.error(`Error al asignar el lead ${error.message}`);
        },
      },
    );
  };
  return (
    <Button disabled={isPending} onClick={assignLeadFn}>
      {children} {isPending && <Loader />}
    </Button>
  );
}
