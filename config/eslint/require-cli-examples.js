// @ts-check

/**
 * Walk up the parent chain while the node is still the object of a member
 * expression that is itself being called — i.e., while we are still inside the
 * same fluent method chain.
 *
 * @param {import("eslint").Rule.Node} node
 * @returns {import("eslint").Rule.Node}
 */
function getRootOfChain(node) {
  let current = node;
  while (
    current.parent?.type === "MemberExpression" &&
    current.parent.parent?.type === "CallExpression" &&
    current.parent.parent.callee === current.parent
  ) {
    current = current.parent.parent;
  }
  return current;
}

/**
 * Walk down a method chain from its outermost call expression, collecting
 * every method name and its arguments.
 *
 * @param {import("eslint").Rule.Node} rootNode
 * @returns {{ methodName: string, args: unknown[], node: import("eslint").Rule.Node }[]}
 */
function collectChainCalls(rootNode) {
  const calls = [];
  let current = rootNode;
  while (current?.type === "CallExpression") {
    if (current.callee.type === "MemberExpression") {
      const prop = current.callee.property;
      calls.push({
        methodName: prop.type === "Identifier" ? prop.name : String(prop.value),
        args: current.arguments,
        node: current,
      });
      current = current.callee.object;
    } else {
      break;
    }
  }
  return calls;
}

/**
 * Returns true if the chain includes:
 *   .addHelpText("afterAll", createExampleText(...))
 *
 * @param {ReturnType<typeof collectChainCalls>} calls
 */
function hasExamplesCall(calls) {
  return calls.some(
    (c) =>
      c.methodName === "addHelpText" &&
      c.args.length >= 2 &&
      c.args[0].type === "Literal" &&
      c.args[0].value === "afterAll" &&
      c.args[1].type === "CallExpression" &&
      c.args[1].callee.type === "Identifier" &&
      c.args[1].callee.name === "createExampleText",
  );
}

/**
 * Returns true if the chain includes an .action(...) call, which distinguishes
 * leaf commands from parent container commands.
 *
 * @param {ReturnType<typeof collectChainCalls>} calls
 */
function hasActionCall(calls) {
  return calls.some((c) => c.methodName === "action");
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        'Require every CLI leaf command to define examples via .addHelpText("afterAll", createExampleText(...))',
    },
    schema: [],
  },
  create(context) {
    return {
      // Pattern: someExpr.command("name").description("...") ... .action(...)
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.property.type !== "Identifier" ||
          node.callee.property.name !== "command" ||
          node.arguments.length < 1 ||
          node.arguments[0].type !== "Literal" ||
          typeof node.arguments[0].value !== "string" ||
          node.arguments[0].value.length === 0
        ) {
          return;
        }

        const root = getRootOfChain(node);
        const calls = collectChainCalls(root);

        if (!hasActionCall(calls)) return;
        if (hasExamplesCall(calls)) return;

        context.report({
          node,
          message: `Command "${node.arguments[0].value}" is missing .addHelpText("afterAll", createExampleText(...)).`,
        });
      },

      // Pattern: new Command().name("name") ... .action(...)
      NewExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          node.callee.name !== "Command"
        ) {
          return;
        }

        const root = getRootOfChain(node);
        if (root.type !== "CallExpression") return;

        const calls = collectChainCalls(root);

        const nameCall = calls.find(
          (c) =>
            c.methodName === "name" &&
            c.args.length >= 1 &&
            c.args[0].type === "Literal" &&
            typeof c.args[0].value === "string",
        );
        if (!nameCall) return;

        if (!hasActionCall(calls)) return;
        if (hasExamplesCall(calls)) return;

        context.report({
          node,
          message: `Command "${nameCall.args[0].value}" is missing .addHelpText("afterAll", createExampleText(...)).`,
        });
      },
    };
  },
};
