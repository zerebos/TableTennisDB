import {node} from "@zerebos/eslint-config";
import ts from "@zerebos/eslint-config-typescript";


export default [
    ...node,
    ...ts,
    {
        rules: {
            "no-console": "off",
        }
    }
];