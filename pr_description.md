🎯 **What:** Modified `GridSelector` parameter types to explicitly use `LabelPos` instead of an overly broad object type `{ x: string, y: string }` and `(v: any) => void`.

💡 **Why:** By mapping precisely to the existing `LabelPos` interface that controls `x` as `'left' | 'center' | 'right'` and `y` as `'top' | 'center' | 'bottom'`, we tighten up the types. This helps eliminate explicit `any` usages and potential bugs.

✅ **Verification:** Handled TypeScript compilation check via a `vite build` to guarantee it successfully typechecks the change. No errors resulted from the change.

✨ **Result:** Enhanced the maintainability and readability by utilizing shared types over hardcoded `string` definitions. The code health improved without altering the behavior.
