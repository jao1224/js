# Gerenciador de Tarefas

Um aplicativo móvel desenvolvido com React Native e Expo para gerenciar tarefas e sub-tarefas de forma eficiente.

## Funcionalidades

- ✅ Criar, editar e excluir tarefas
- 📝 Adicionar sub-itens às tarefas
- 🏷️ Categorizar tarefas
- 🔍 Filtrar tarefas por categoria
- 🗑️ Histórico de itens excluídos com possibilidade de restauração
- ✨ Interface intuitiva e moderna

## Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn
- Expo CLI
- Um dispositivo móvel com Expo Go instalado ou um emulador
- Conta no Firebase

## Comandos de Instalação

1. Instale o Expo CLI globalmente:
```bash
npm install -g expo-cli
```

2. Crie um novo projeto Expo:
```bash
npx create-expo-app gerenciador-tarefas
cd gerenciador-tarefas
```

3. Instale as dependências necessárias:
```bash
npm install @react-native-async-storage/async-storage@1.23.1
npm install react-native-elements@3.4.3
npm install @react-navigation/native
npm install @react-navigation/stack
npm install react-native-gesture-handler
npm install react-native-safe-area-context
npm install react-native-screens
```

4. Para desenvolvimento:
```bash
npm install --save-dev @babel/core@^7.20.0
```

5. Para executar o projeto:
```bash
npx expo start
# ou
npx expo start --port 8081
# ou
npx expo start --tunnel  # se houver problemas de conexão
```

6. Para limpar o cache (caso necessário):
```bash
npx expo start -c
```

## Dependências

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "1.23.1",
    "react": "18.2.0",
    "react-native": "0.72.6",
    "react-native-elements": "^3.4.3",
    "expo": "~49.0.0",
    "expo-status-bar": "~1.6.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "react-native-gesture-handler": "~2.12.0",
    "react-native-safe-area-context": "4.6.3",
    "react-native-screens": "~3.22.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0"
  }
}
```

## Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd gerenciador-tarefas
```

2. Instale as dependências do projeto:
```bash
npm install
```

3. Instale as dependências do Expo:
```bash
npm install -g expo-cli
```

4. Instale as dependências do Firebase:
```bash
# Instalação do Firebase core
npm install firebase

# Instalação dos módulos do React Native Firebase
npm install @react-native-firebase/app
npm install @react-native-firebase/firestore
npm install @react-native-firebase/auth
```

5. Outras dependências necessárias:
```bash
npm install @react-native-async-storage/async-storage@1.23.1
npm install react-native-elements@3.4.3
npm install @react-navigation/native
npm install @react-navigation/stack
npm install react-native-gesture-handler
npm install react-native-safe-area-context
npm install react-native-screens
```

## Configuração do Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com)
2. Crie um novo projeto ou selecione um existente
3. No menu lateral, clique em "Authentication" e habilite a autenticação anônima
4. No menu lateral, clique em "Firestore Database" e configure as regras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Executando o Projeto

```bash
# Iniciar o projeto
npx expo start

# Caso precise limpar o cache
npx expo start --clear

# Para usar uma porta específica
npx expo start --port 8082

# Para usar o modo tunnel
npx expo start --tunnel
```

## Solução de Problemas

Se encontrar problemas com o Firebase:

1. Verifique se a autenticação anônima está habilitada no Console do Firebase
2. Verifique se as regras do Firestore estão configuradas corretamente
3. Limpe o cache do projeto:
```bash
npx expo start -c
```

## Como Usar

1. **Adicionar Tarefa:**
   - Digite o título da tarefa
   - Adicione uma categoria
   - Clique em "Adicionar Tarefa"

2. **Gerenciar Tarefas:**
   - Marque como concluída
   - Edite o texto ou categoria
   - Adicione sub-itens
   - Exclua a tarefa

3. **Sub-itens:**
   - Adicione sub-itens às tarefas
   - Marque sub-itens como concluídos
   - Exclua sub-itens individualmente

4. **Filtros:**
   - Use os filtros por categoria
   - Visualize todas as tarefas ou filtre por categoria específica

5. **Histórico:**
   - Acesse o histórico de itens excluídos
   - Restaure tarefas ou sub-itens excluídos
   - Exclua permanentemente itens do histórico

## Estrutura do Projeto

- `App.js`: Componente principal com toda a lógica da aplicação
- `src/`: Diretório com componentes e utilitários
- Armazenamento local usando AsyncStorage para persistência de dados

## Contribuição

Sinta-se à vontade para contribuir com o projeto. Abra uma issue ou envie um pull request com suas sugestões de melhorias.

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes. 