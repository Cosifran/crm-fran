import { selectLeadWithUsers } from "../queries/index";

export async function getAll() {
  return selectLeadWithUsers();
}