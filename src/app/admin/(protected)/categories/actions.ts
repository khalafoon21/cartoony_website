"use server";

import {
  createAdminCategory,
  deleteAdminCategory,
  updateAdminCategory,
  type CategoryPayload,
} from "@/lib/categories-admin";

export async function createCategoryAction(payload: CategoryPayload) {
  return createAdminCategory(payload);
}

export async function updateCategoryAction(id: string, payload: CategoryPayload) {
  return updateAdminCategory(id, payload);
}

export async function deleteCategoryAction(id: string) {
  return deleteAdminCategory(id);
}
