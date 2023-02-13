import { JsonSchema, UISchemaElement } from '../web/node_modules/@jsonforms/core'

export type JsonForm  = {
    schema: JsonSchema,
    uischema: UISchemaElement
    data: any
}