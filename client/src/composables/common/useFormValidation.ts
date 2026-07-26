import { ref, computed, type Ref } from 'vue'
import { type ZodSchema, ZodError } from 'zod'

export function useFormValidation<T extends Record<string, any>>(
  schema: ZodSchema<T>,
  formData: Ref<T>,
) {
  const errors = ref<Partial<Record<keyof T, string>>>({})
  const touched = ref<Set<keyof T>>(new Set())

  const isValid = computed(() => {
    const result = schema.safeParse(formData.value)
    return result.success
  })

  function validateField(field: keyof T) {
    // Create a partial schema to validate only this field
    const fieldSchema = schema.pick({ [field]: true } as any)
    const result = fieldSchema.safeParse({ [field]: formData.value[field] })
    if (result.success) {
      if (field in errors.value) {
        delete errors.value[field]
      }
    } else {
      const zodError = result.error as ZodError
      const issue = zodError.issues.find((i: any) => {
        const path = i.path as (string | number)[]
        return path[0] === field
      })
      if (issue) {
        errors.value[field] = issue.message
      }
    }
  }

  function handleBlur(field: keyof T) {
    touched.value.add(field)
    validateField(field)
  }

  function validate(): boolean {
    const result = schema.safeParse(formData.value)
    if (result.success) {
      errors.value = {} as any
      return true
    }

    const zodError = result.error as ZodError

    // Clear existing errors
    errors.value = {} as any

    // Set field-level errors from Zod issues
    for (const issue of zodError.issues) {
      const path = issue.path as (string | number)[]
      if (path.length === 1) {
        const field = path[0] as keyof T
        // Only set if not already set (first error wins)
        if (!errors.value[field]) {
          errors.value[field] = issue.message
        }
      }
    }

    // Mark all fields with errors as touched
    for (const key of Object.keys(errors.value) as (keyof T)[]) {
      touched.value.add(key)
    }

    return false
  }

  function clearErrors() {
    errors.value = {} as any
    touched.value = new Set()
  }

  return {
    errors,
    touched,
    isValid,
    validateField,
    handleBlur,
    validate,
    clearErrors,
  }
}
