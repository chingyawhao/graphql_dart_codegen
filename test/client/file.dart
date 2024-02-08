import 'dart:io';
import 'package:test/test.dart';
import './generated/graphql.dart';

void main() {
  final graphqlSdk = GraphqlSdk(
    http: 'http://localhost:8080',
    getToken: () async => '',
  );

  test('Add todo with file', () async {
    final todo = await graphqlSdk.AddToDoFile(
      title: 'Try out codegen mutation with file',
      text: "Let's do this...",
      file: File.fromUri(Uri.parse('file://${Directory.current.path}/test/client/files/SpongeBob.png')),
    );

    expect(
      todo?.addToDo,
      predicate((todo) {
        if (todo is! AddToDoFile_Response_addToDo) return false;
        expect(todo.id, isA<String>());
        expect(todo.title, 'Try out codegen mutation with file');
        expect(todo.text, "Let's do this...");
        expect(todo.files, equals([
          predicate((file) {
            if (file is! AddToDoFile_Response_addToDo_files) return false;
            expect(file.id, isA<String>());
            expect(file.name, 'SpongeBob.png');
            expect(file.url, matches(RegExp(r'^http://localhost:8080/addToDo-\d+-\d+/SpongeBob.png$')));
            return true;
          })
        ]));
        return true;
      })
    );
  });

  test('Add todo with files', () async {
    final todo = await graphqlSdk.AddToDoFiles(
      title: 'Try out codegen mutation with files',
      text: "Let's not fail now...",
      files: [
        File.fromUri(Uri.parse('file://${Directory.current.path}/test/client/files/SpongeBob.png')),
        File.fromUri(Uri.parse('file://${Directory.current.path}/test/client/files/Patrick.png'))
      ],
    );

    expect(
      todo?.addToDo,
      predicate((todo) {
        if (todo is! AddToDoFiles_Response_addToDo) return false;
        expect(todo.id, isA<String>());
        expect(todo.title, 'Try out codegen mutation with files');
        expect(todo.text, "Let's not fail now...");
        expect(todo.files, equals([
          predicate((file) {
            if (file is! AddToDoFiles_Response_addToDo_files) return false;
            expect(file.id, isA<String>());
            expect(file.name, 'SpongeBob.png');
            expect(file.url, matches(RegExp(r'^http://localhost:8080/addToDo-\d+-\d+/SpongeBob.png$')));
            return true;
          }),
          predicate((file) {
            if (file is! AddToDoFiles_Response_addToDo_files) return false;
            expect(file.id, isA<String>());
            expect(file.name, 'Patrick.png');
            expect(file.url, matches(RegExp(r'^http://localhost:8080/addToDo-\d+-\d+/Patrick.png$')));
            return true;
          })
        ]));
        return true;
      })
    );
  });
}
