"use client";

import { useCallback, useState } from "react";
import type { z } from "zod";
import { toast } from "sonner";
import { isDuplicateCodeError, resolveApiErrorMessage } from "../utils/error-message";

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/**
 * Hand-rolled form state. The repository has no accepted form library, so this
 * mirrors `features/identity/components/org-settings-dialog.tsx`.
 */
export function useResourceForm<TValues extends Record<string, string | boolean>>(
  initialValues: TValues,
  schema: z.ZodType<unknown>,
  options: {
    /** Field the backend's 409 refers to, so the conflict lands on the input. */
    uniqueField: keyof TValues & string;
    uniqueMessage: string;
    submit: (values: TValues) => Promise<unknown>;
    onSuccess: () => void;
    successMessage: string;
  }
) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<TValues>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(
    <K extends keyof TValues & string>(key: K, value: TValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  const reset = useCallback(
    (next: TValues) => {
      setValues(next);
      setErrors({});
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    const parsed = schema.safeParse(values);

    if (!parsed.success) {
      const fieldErrors: FieldErrors<TValues> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key as keyof TValues & string]) {
          fieldErrors[key as keyof TValues & string] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    setIsSubmitting(true);
    try {
      await options.submit(values);
      toast.success(options.successMessage);
      options.onSuccess();
      return true;
    } catch (error) {
      if (isDuplicateCodeError(error)) {
        setErrors({
          [options.uniqueField]: options.uniqueMessage,
        } as FieldErrors<TValues>);
      } else {
        toast.error(resolveApiErrorMessage(error));
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, values, options]);

  return { values, errors, isSubmitting, setValue, reset, handleSubmit };
}
