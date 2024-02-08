import * as graphql from 'graphql'
import pluginHelpers from '@graphql-codegen/plugin-helpers'

type Method = {
  type: 'query' | 'mutation' | 'subscription'
  name: string
  parameters: Parameter[]
  returnType: OutputType
  raw: string
}

type Parameter = {
  name: string
  type: InputType
}

type InputType =
  | {
      type: 'Scalar'
      kind: 'Int' | 'String' | 'Boolean' | 'Float' | 'ID' | 'Date' | 'Base64'
    }
  | {
      type: 'Enum'
      name: string
      values: string[]
    }
  | {
      type: 'Object'
      name: string
      fields: Parameter[]
    }
  | {
      type: 'NonNullable'
      ofType: InputType
    }
  | {
      type: 'List'
      ofType: InputType
    }
  | {
      type: 'Upload'
    }

const convertGraphqlInputType = ({
  schema,
  node,
}: {
  schema: graphql.GraphQLSchema
  node: graphql.TypeNode
}): InputType => {
  switch (node.kind) {
    case graphql.Kind.NAMED_TYPE: {
      switch (node.name.value) {
        case 'Int':
        case 'String':
        case 'Boolean':
        case 'Float':
        case 'ID':
        case 'Date': {
          return {
            type: 'Scalar',
            kind: node.name.value,
          }
        }
        case 'Upload': {
          return {
            type: 'Upload',
          }
        }
        default: {
          const inputType = schema.getType(node.name.value)
          if (inputType instanceof graphql.GraphQLInputObjectType) {
            const fields = inputType.getFields()
            return {
              type: 'Object',
              name: node.name.value,
              fields: Object.keys(fields).map((fieldName) => ({
                name: fieldName,
                type: processInputNode({
                  schema,
                  inputType: fields[fieldName].type,
                }),
              })),
            }
          }

          throw new Error(`Not handled yet: ${inputType?.name}`)
        }
      }
    }
    case graphql.Kind.LIST_TYPE: {
      return {
        type: 'List',
        ofType: convertGraphqlInputType({ schema, node: node.type }),
      }
    }
    case graphql.Kind.NON_NULL_TYPE: {
      return {
        type: 'NonNullable',
        ofType: convertGraphqlInputType({ schema, node: node.type }),
      }
    }
  }
}

const processInputNode = ({
  schema,
  inputType,
}: {
  schema: graphql.GraphQLSchema
  inputType: graphql.GraphQLInputType
}): InputType => {
  if (inputType instanceof graphql.GraphQLScalarType) {
    switch (inputType.name) {
      case 'Int':
      case 'String':
      case 'Boolean':
      case 'Float':
      case 'ID':
      case 'Date': {
        return {
          type: 'Scalar',
          kind: inputType.name,
        }
      }
      default: {
        throw new Error(`Unexpected. All cases should be handled already`)
      }
    }
  }

  if (inputType instanceof graphql.GraphQLEnumType) {
    return {
      type: 'Enum',
      name: inputType.name,
      values: inputType.getValues().map((value) => value.name),
    }
  }

  if (inputType instanceof graphql.GraphQLInputObjectType) {
    const fields = inputType.getFields()
    return {
      type: 'Object',
      name: inputType.name,
      fields: Object.keys(fields).map((fieldName) => ({
        name: fieldName,
        type: processInputNode({ schema, inputType: fields[fieldName].type }),
      })),
    }
  }

  if (inputType instanceof graphql.GraphQLList) {
    return {
      type: 'List',
      ofType: processInputNode({ schema, inputType: inputType.ofType }),
    }
  }

  if (inputType instanceof graphql.GraphQLNonNull) {
    return {
      type: 'NonNullable',
      ofType: processInputNode({ schema, inputType: inputType.ofType }),
    }
  }

  throw new Error(`Unexpected. All cases should be handled already`)
}

type ObjectTypeDefinition<T extends OutputType | InputType> = {
  name: string
  fields: ObjectTypeDefinitionField<T>[]
}

type ObjectTypeDefinitionField<T extends OutputType | InputType> = {
  name: string
  type: T
}

type OutputType =
  | {
      type: 'Scalar'
      name: string
    }
  | {
      type: 'Object'
      name: string
      fields: ObjectTypeDefinitionField<OutputType>[]
    }
  | {
      type: 'Enum'
      name: string
      values: string[]
    }
  | {
      type: 'List'
      ofType: OutputType
    }
  | {
      type: 'NonNullable'
      ofType: OutputType
    }

const convertGraphqlOutputType = ({
  schema,
  selection,
  type,
  generatedTypeName,
}: {
  schema: graphql.GraphQLSchema
  selection: graphql.SelectionNode
  /** Type where the selection set applies on. */
  type: graphql.GraphQLOutputType
  generatedTypeName: string
}): OutputType => {
  if (type instanceof graphql.GraphQLScalarType) {
    return {
      type: 'Scalar',
      name: type.name,
    }
  }

  if (type instanceof graphql.GraphQLObjectType) {
    switch (selection.kind) {
      case graphql.Kind.FIELD: {
        if (!selection.selectionSet) {
          throw new Error(`Missing selection for object type: ${type.name}`)
        }
        return processSelectionSetNode({
          schema,
          selectionSet: selection.selectionSet,
          selectType: type,
          generatedTypeName,
        })
      }
      case graphql.Kind.INLINE_FRAGMENT: {
        throw new Error('Cannot handle inline fragment yet')
      }
      case graphql.Kind.FRAGMENT_SPREAD: {
        throw new Error(`Cannot handle fragment spread yet`)
      }
    }
  }

  if (type instanceof graphql.GraphQLInterfaceType) {
    throw new Error(`Cannot handle GraphQLInterfaceType yet`)
  }

  if (type instanceof graphql.GraphQLEnumType) {
    return {
      type: 'Enum',
      name: type.name,
      values: type.getValues().map((value) => value.name),
    }
  }

  if (type instanceof graphql.GraphQLList) {
    return {
      type: 'List',
      ofType: convertGraphqlOutputType({
        type: type.ofType,
        schema,
        generatedTypeName,
        selection,
      }),
    }
  }

  if (type instanceof graphql.GraphQLNonNull) {
    return {
      type: 'NonNullable',
      ofType: convertGraphqlOutputType({
        type: type.ofType,
        schema,
        generatedTypeName,
        selection,
      }),
    }
  }

  throw new Error(`Unexpected. All cases should be handled already`)
}

const processSelectionSetNode = ({
  schema,
  selectionSet,
  selectType,
  generatedTypeName,
}: {
  schema: graphql.GraphQLSchema
  selectionSet: graphql.SelectionSetNode
  /** Type where the selection set applies on. */
  selectType: graphql.GraphQLObjectType
  generatedTypeName: string
}): OutputType => {
  const fields = selectType.getFields()
  return {
    type: 'Object',
    name: generatedTypeName,
    fields: selectionSet.selections.map((selection) => {
      switch (selection.kind) {
        case 'Field': {
          const fieldName = selection.name.value
          const fieldDefinition = fields?.[fieldName]
          const { type } = fieldDefinition

          return {
            name: fieldName,
            type: convertGraphqlOutputType({
              schema,
              type,
              generatedTypeName: `${generatedTypeName}_${fieldName}`,
              selection,
            }),
          }
        }
        default: {
          throw new Error(`Not handled yet: ${selection.kind}`)
        }
      }
    }),
  }
}

export const plugin = (
  schema: graphql.GraphQLSchema,
  documents: pluginHelpers.Types.DocumentFile[]
) => {
  const methods: Method[] = documents.flatMap((documentFile) => {
    console.log(`Generating Dart Graphql SDK for ${documentFile.location}`)
    if (!documentFile.document) {
      throw new Error(`documentFile.document is not defined`)
    }
    const errors = graphql.validate(schema, documentFile.document)
    if (errors.length > 0) {
      throw new Error(JSON.stringify(errors, null, 2))
    }
    const { document } = documentFile
    console.log('=================')
    console.log(documentFile.location)
    console.log('=================')
    switch (document?.kind) {
      case 'Document': {
        const result: Method[] = document.definitions.map((definition) => {
          switch (definition.kind) {
            case 'OperationDefinition': {
              const operationType = definition.operation
              if (!['query', 'mutation', 'subscription'].includes(operationType)) {
                throw new Error(`Unexpected operation ${operationType}`)
              }
              const operationName = definition.name
              if (!operationName) {
                throw new Error(`Operation cannot be anonymous`)
              }
              const parameters: Parameter[] = (
                definition.variableDefinitions ?? []
              ).map((variableDefinition) => {
                return {
                  name: variableDefinition.variable.name.value,
                  type: convertGraphqlInputType({
                    schema,
                    node: variableDefinition.type,
                  }),
                }
              })

              if (!definition.selectionSet) {
                throw new Error(
                  `definition.selectionSet is not expected to be undefined`
                )
              }

              const rootType = schema.getRootType(operationType)
              if (!rootType) {
                throw new Error(`rootType is undefined`)
              }
              const returnType: OutputType = processSelectionSetNode({
                selectionSet: definition.selectionSet,
                selectType: rootType,
                schema,
                generatedTypeName: `${operationName.value}_Response`,
              })
              const method: Method = {
                type: operationType,
                name: operationName.value,
                parameters,
                returnType,
                raw:
                  definition.loc?.source?.body?.slice(
                    definition.loc?.start ?? 0,
                    definition.loc?.end ?? 0
                  ) ?? '',
              }

              return method
            }
            default: {
              throw new Error(`Not handled yet: ${definition.kind}`)
            }
          }
        })
        return result
      }
      default: {
        throw new Error(`Not handled yet: ${document.kind}`)
      }
    }
  })

  const getDartInputType = (
    parameterType: InputType,
    option = { nullable: true }
  ): string => {
    switch (parameterType.type) {
      case 'NonNullable':
        return getDartInputType(parameterType.ofType, { nullable: false })
      case 'Scalar': {
        const type = (() => {
          switch (parameterType.kind) {
            case 'ID':
            case 'String':
            case 'Date':
            case 'Base64':
              return 'String'
            case 'Boolean':
              return 'bool'
            case 'Int':
              return 'int'
            case 'Float':
              return 'double'
            default:
              return 'dynamic'
          }
        })()
        return `${type}${option.nullable ? '?' : ''}`
      }
      case 'Enum':
      case 'Object':
        return `Input_${parameterType.name}${option.nullable ? '?' : ''}`
      case 'List':
        return `List<${getDartInputType(parameterType.ofType)}>${
          option.nullable ? '?' : ''
        }`
      case 'Upload':
        return `File${option.nullable ? '?' : ''}`
      default:
        throw new Error(`Not handled yet`)
    }
  }

  const getDartOutputType = (
    returnType: OutputType,
    option = { nullable: true }
  ): string => {
    switch (returnType.type) {
      case 'NonNullable':
        return getDartOutputType(returnType.ofType, { nullable: false })
      case 'Scalar': {
        const type = (() => {
          switch (returnType.name) {
            case 'ID':
            case 'String':
            case 'Base64':
              return 'String'
            case 'Date':
              return 'DateTime'
            case 'Boolean':
              return 'bool'
            case 'Int':
              return 'int'
            case 'Float':
              return 'double'
            default:
              return 'dynamic'
          }
        })()
        return `${type}${option.nullable ? '?' : ''}`
      }
      case 'List':
        return `List<${getDartOutputType(returnType.ofType)}>${
          option.nullable ? '?' : ''
        }`
      case 'Object':
      case 'Enum':
        return `${returnType.name}${option.nullable ? '?' : ''}`
    }
  }

  const extractParameterClassTypes = (
    inputType: InputType
  ): ObjectTypeDefinition<InputType>[] => {
    switch (inputType.type) {
      case 'List':
      case 'NonNullable':
        return extractParameterClassTypes(inputType.ofType)
      case 'Object':
        return [
          inputType,
          ...inputType.fields.flatMap((field) =>
            extractParameterClassTypes(field.type)
          ),
        ]
      default:
        return []
    }
  }
  const extractReturnClassTypes = (
    returnType: OutputType
  ): ObjectTypeDefinition<OutputType>[] => {
    switch (returnType.type) {
      case 'List':
      case 'NonNullable':
        return extractReturnClassTypes(returnType.ofType)
      case 'Object':
        return [
          returnType,
          ...returnType.fields.flatMap((field) =>
            extractReturnClassTypes(field.type)
          ),
        ]
      default:
        return []
    }
  }
  const extractReturnEnumTypes = (
    returnType: OutputType
  ): Extract<OutputType, { type: 'Enum' }>[] => {
    switch (returnType.type) {
      case 'List':
      case 'NonNullable':
        return extractReturnEnumTypes(returnType.ofType)
      case 'Object':
        return returnType.fields.flatMap((field) =>
          extractReturnEnumTypes(field.type)
        )
      case 'Enum':
        return [returnType]
      default:
        return []
    }
  }
  const serializeParameterToJson = (parameter: Parameter): string => {
    switch (parameter.type.type) {
      case 'List':
      case 'NonNullable':
        return serializeParameterToJson({
          ...parameter,
          type: parameter.type.ofType,
        })
      case 'Object':
        return `'${parameter.name}': ${parameter.name}.toJson()`
      default:
        return `'${parameter.name}': ${parameter.name}`
    }
  }

  return `
import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart' as http_io;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:http_parser/http_parser.dart';
import 'package:uuid/uuid.dart';
import 'package:mime/mime.dart' as mime;

final uuid = Uuid();

abstract class _GraphqlInput {
  const _GraphqlInput();

  dynamic toJson();
}
${methods
  .flatMap((method) =>
    method.parameters.flatMap((parameter) =>
      extractParameterClassTypes(parameter.type)
    )
  )
  .filter(
    (returnDefinition, index, returnDefinitions) =>
      returnDefinitions.findIndex(
        (type) => type.name === returnDefinition.name
      ) === index
  )
  .map(
    (returnDefinition) => `
class Input_${returnDefinition.name} extends _GraphqlInput {
  ${returnDefinition.fields
    .map((field) => `final ${getDartInputType(field.type)} ${field.name};`)
    .join('\n')}
  const Input_${returnDefinition.name}({
  ${returnDefinition.fields
    .map(
      (field) =>
        `${field.type.type === 'NonNullable' ? 'required ' : ''}this.${
          field.name
        },`
    )
    .join('\n')}
  });

  @override
  toJson() {
    return {
    ${returnDefinition.fields.map(serializeParameterToJson).join(',\n')}
    };
  }
}`
  )}
${methods
  .flatMap((method) => extractReturnEnumTypes(method.returnType))
  .filter(
    (enumType, index, enumTypes) =>
      enumTypes.findIndex((type) => type.name === enumType.name) === index
  )
  .map(
    (enumType) => `
enum ${enumType.name} {
${enumType.values.map((value) => `${value},`).join('\n')}
}
`
  )
  .join('')}
${methods
  .flatMap((method) => extractReturnClassTypes(method.returnType))
  .map(
    (returnDefinition) => `
class ${returnDefinition.name} {
${returnDefinition.fields
  .map((field) => `final ${getDartOutputType(field.type)} ${field.name};`)
  .join('\n')}
  const ${returnDefinition.name}({
  ${returnDefinition.fields
    .map(
      (field) =>
        `${field.type.type === 'NonNullable' ? 'required ' : ''}this.${
          field.name
        },`
    )
    .join('\n')}
  });

  factory ${returnDefinition.name}.fromJson(dynamic json) {
    return ${returnDefinition.name}(
    ${returnDefinition.fields
      .map((field) => {
        const castType = (
          variable: string,
          returnType: OutputType,
          option = { nullable: true }
        ): string => {
          switch (returnType.type) {
            case 'NonNullable':
              return castType(variable, returnType.ofType, { nullable: false })
            case 'Scalar': {
              if (returnType.name === 'Float') {
                return `${variable}${option.nullable ? '?' : ''}.toDouble()`
              } else if (returnType.name === 'Date') {
                return `DateTime.parse(${variable})`
              } else {
                return `${variable} as ${getDartOutputType(returnType, option)}`
              }
            }
            case 'List':
              return `${variable}${
                option.nullable ? '?' : ''
              }.map<${getDartOutputType(returnType.ofType, option)}>((data) =>
              ${castType('data', returnType.ofType)}
            ).toList() as List<${getDartOutputType(
              returnType.ofType,
              option
            )}>${option.nullable ? '?' : ''}`
            case 'Object': {
              const cast = `${returnType.name}.fromJson(${variable})`
              if (option.nullable) {
                return `${variable} != null ? ${cast} : null`
              } else {
                return cast
              }
            }
            case 'Enum':
              return `${
                returnType.name
              }.values.firstWhere((value) => value.name == ${variable}${
                option.nullable
                  ? `, orElse:() => null as ${getDartOutputType(
                      returnType,
                      option
                    )}`
                  : ''
              })`
          }
        }
        return `${field.name}: ${castType(
          `json['${field.name}']`,
          field.type
        )},`
      })
      .join('\n')}
    );
  }
}
`
  )
  .join('')}

class GraphqlSdk {
  final String _uri;
  final WebSocketChannel _socketChannel;
  final Future<String> Function() _getToken;
  final void Function(dynamic error, StackTrace? stackTrace)? _handleError;
  GraphqlSdk({
    required String http,
    String? ws,
    required Future<String> Function() getToken,
    void Function(dynamic error, StackTrace? stackTrace)? handleError
  })
    : _uri = http,
      _socketChannel = WebSocketChannel.connect(
        Uri.parse(ws ?? http.replaceFirst(RegExp(r'^http'), 'ws')),
        protocols: ['graphql-transport-ws']
      ),
      _getToken = getToken,
      _handleError = handleError {
        _connectSocket();
      }

  dispose() {
    _socketChannel.sink.close();
  }

  Stream<dynamic>? _socketStream;
  Future<void> _connectSocket() async {
    final completer = Completer<void>();
    void start() async {
      late String token;
      try {
        await (
          (() async => token = await _getToken())(),
          _socketChannel.ready
        ).wait;
        _socketChannel.sink.add(
          json.encode({
            'type': 'connection_init',
            'payload': {'Authorization': token},
          })
        );
        _socketStream = _socketChannel.stream.asBroadcastStream();
        _socketStream!.listen((data) {
          final body = json.decode(data);
          if (body['type'] == 'connection_ack') {
            completer.complete();
          }
          if (body['type'] == 'ping') {
            _socketChannel.sink.add(json.encode({'type': 'pong'}));
          }
        });
        if (_handleError != null) {
          _socketStream!.handleError((error) {
            completer.completeError(error, StackTrace.current);
          });
        }
      } catch (error, stackTrace) {
        if (error is ParallelWaitError) {
          if (error.errors is (dynamic, AsyncError?)) {
            return;
          }
          completer.completeError(error, stackTrace);
        } else {
          completer.completeError(error, stackTrace);
        }
      }
    }
    start();
    return completer.future;
  }

  Future<MediaType?> _getMimeType(File file) async {
    final mimeType = mime.lookupMimeType(file.path);
    return mimeType != null ? MediaType.parse(mimeType) : null;
  }
  Future<dynamic> _request(String operation, Map<String, dynamic> variables) async {
    try {
      final client = http_io.IOClient();
      final files = variables.entries
        .where((entry) =>
          entry.value is File ||
          entry.value is List<File>
        )
        .toList();
      final request = files.isEmpty
        ? http.Request('POST', Uri.parse(_uri))
        : http.MultipartRequest('POST', Uri.parse(_uri));
      request.headers['authorization'] = await _getToken();
      request.headers['content-type'] = 'application/json';
      if (request is http.MultipartRequest) {
        request.headers['Apollo-Require-Preflight'] = 'true';
        Map<String, List<String>> map = {};
        for (final entry in files) {
          if (entry.value is List<File>) {
            var index = 0;
            for (final file in entry.value as List<File>) {
              final multipartFile = http.MultipartFile.fromBytes(
                map.length.toString(),
                await file.readAsBytes(),
                filename: file.path.split('/').last,
                contentType: await _getMimeType(file),
              );
              map.addEntries([MapEntry(
                multipartFile.field,
                ['variables.\${entry.key}.$index']
              )]);
              request.files.add(multipartFile);
              index++;
            }
          } else if (entry.value is File) {
            final file = entry.value as File;
            final multipartFile = http.MultipartFile.fromBytes(
              map.length.toString(),
              await file.readAsBytes(),
              filename: file.path.split('/').last,
              contentType: await _getMimeType(file),
            );
            map.addEntries([MapEntry(
              multipartFile.field,
              ['variables.\${entry.key}']
            )]);
            request.files.add(multipartFile);
          }
        }
        request.fields['operations'] = json.encode({
          'query': operation,
          'variables': variables.entries
            .fold<Map<String, dynamic>>(
              {},
              (variables, entry) {
                if (entry.value is List<File>) {
                  variables[entry.key] = (entry.value as List<File>)
                    .map((_) => null).toList();
                } else if (entry.value is File) {
                  variables[entry.key] = null;
                } else {
                  variables[entry.key] = entry.value;
                }
                return variables;
              },
            )
        });
        request.fields['map'] = json.encode(map);
      } else if (request is http.Request) {
        request.body = json.encode({
          'query': operation,
          'variables': variables,
        });
      }
      final stream = await client.send(request);
      final response = await http.Response.fromStream(stream);
      final body = json.decode(response.body);
      final errors = body['errors'];
      final data = body['data'];
      if ((errors ?? []).length > 0) {
        throw Exception(errors[0]);
      } else {
        return data;
      }
    } catch (error, stackTrace) {
      _handleError?.call(error, stackTrace);
      rethrow;
    }
  }

  Stream<dynamic> _subscribe(
    String operation,
    dynamic variables
  ) async* {
    try {
      if (_socketStream == null) {
        await _connectSocket();
      }
      final messageId = uuid.v4();
      final subscription = StreamController<dynamic>(
        onCancel: () => _socketChannel.sink.add(
          json.encode({'type': 'complete', 'id': messageId})
        )
      );
      _socketChannel.sink.add(json.encode({
        'type': 'subscribe',
        'id': messageId,
        'payload': {
          'query': operation,
          'variables': variables,
        }
      }));
      _socketStream!.listen((data) {
        final body = json.decode(data);
        if (body['type'] == 'next' && body['id'] == messageId) {
          final errors = body['payload']['errors'];
          final data = body['payload']['data'];
          if((errors?? []).length > 0) {
            subscription.addError(Exception(errors[0]));
          } else {
            subscription.add(data);
          }
        }
      });
      yield* subscription.stream;
    } catch (error, stackTrace) {
      _handleError?.call(error, stackTrace);
      rethrow;
    }
  }

${methods
  .map(
    (method) => {
      switch (method.type) {
        case 'query':
        case 'mutation':
          return `
  Future<${getDartOutputType(method.returnType)}> ${method.name}(${
    method.parameters.length > 0
      ? `{
          ${method.parameters
            .map(
              (parameter) =>
                `${
                  parameter.type.type === 'NonNullable' ? 'required ' : ''
                }${getDartInputType(parameter.type)} ${parameter.name},`
            )
            .join('\n')}
          }`
      : ''
  }) async {
    final data = await _request(
      '''${method.raw.replace(/\$/g, '\\$')}''',
      {
      ${method.parameters.map(serializeParameterToJson).join(',\n')}
      }
    );
    return ${getDartOutputType(method.returnType)}.fromJson(data);
  }
`
        case 'subscription':
          return `
  Stream<${getDartOutputType(method.returnType)}> ${method.name}(${
    method.parameters.length > 0
      ? `{
          ${method.parameters
            .map(
              (parameter) =>
                `${
                  parameter.type.type === 'NonNullable' ? 'required ' : ''
                }${getDartInputType(parameter.type)} ${parameter.name},`
            )
            .join('\n')}
          }`
      : ''
  }) async* {
    final datum = _subscribe(
      '''${method.raw.replace(/\$/g, '\\$')}''',
      {
      ${method.parameters.map(serializeParameterToJson).join(',\n')}
      }
    );
    await for (final data in datum) {
      yield ${getDartOutputType(method.returnType)}.fromJson(data);
    }
  }
`
      }
    }
  )
  .join('\n')}
}
`
}
