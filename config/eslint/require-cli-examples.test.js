import { describe, it } from "vitest";
import { parser as typescriptParser } from "typescript-eslint";
import { RuleTester } from "eslint";

import requireCliExamples from "./require-cli-examples.js";

describe("require-cli-examples", () => {
  it("should require examples to be defined for each leaf-node command", () => {
    const ruleTester = new RuleTester({
      languageOptions: {
        parser: typescriptParser,
      },
    });
    ruleTester.run("require-cli-examples", requireCliExamples, {
      valid: [
        // new Command() chain with examples — should pass
        {
          code: `
            const command = new Command()
              .name("some_command_name")
              .description("Some description")
              .addHelpText("afterAll", createExampleText([]))
              .action(() => {});
          `,
        },
        // .command() chain with examples — should pass
        {
          code: `
            parent
              .command("some_command_name")
              .description("Some description")
              .addHelpText("afterAll", createExampleText([]))
              .action(() => {});
          `,
        },
        // Container command with no .action() — should pass even without examples
        {
          code: `
            const container = new Command()
              .name("some_command_name")
              .description("Some description");
          `,
        },
      ],
      invalid: [
        // new Command() chain with .action() but no examples
        {
          code: `
            const command = new Command()
              .name("some_command_name")
              .description("Some description")
              .action(() => {});
          `,
          errors: 1,
        },
        // .command() chain with .action() but no examples
        {
          code: `
            parent
              .command("some_command_name")
              .description("Some description")
              .action(() => {});
          `,
          errors: 1,
        },
      ],
    });
  });
});
