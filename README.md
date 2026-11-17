# MarcaAí

Aplicativo mobile de **agenda para salões de beleza e barbearias**, desenvolvido como projeto final (ABP) da disciplina de Desenvolvimento Mobile — Engenharia de Software, SATC, 2026.2.

## O problema

Pequenos salões e barbearias organizam os horários por **WhatsApp e caderno de papel**. Os pedidos chegam misturados com outras conversas, o caderno fica no balcão, e é comum marcar dois clientes no mesmo horário, esquecer de confirmar ou perder o histórico de quem é cliente fiel. Isso gera horários vagos, faltas sem aviso e perda de faturamento.

## A solução

O MarcaAí coloca a agenda no celular do profissional, que já está sempre na mão dele durante o atendimento:

- Agenda do dia com navegação entre datas e resumo do faturamento previsto e concluído
- Cadastro de **clientes** com busca, observações e histórico de atendimentos
- Cadastro de **serviços** com preço e duração
- **Agendamentos** com aviso de conflito de horário e controle de status (agendado, concluído, cancelado)
- **Lembrete pelo WhatsApp** com mensagem pronta para o cliente, em um toque
- **Mapa e geolocalização** para marcar o endereço do estabelecimento
- Login com e-mail e senha, recuperação de senha e sessão persistente (token de acesso do Firebase)

## Requisitos do ABP atendidos

| Requisito | Como foi atendido |
|---|---|
| Persistência de dados | Firebase Cloud Firestore, com dados isolados por usuário |
| Mínimo de 6 telas | 9 telas: Login, Cadastro, Agenda, Agendamento, Clientes, Cliente, Serviços, Serviço, Meu negócio |
| UX amigável | Botões grandes, listas vazias explicativas, validação com mensagens claras, busca sem acento |
| Login/senha e token | Firebase Authentication (JWT renovado automaticamente, sessão salva no AsyncStorage) |
| Tecnologia | React Native + Expo (JavaScript) |
| Nome e ícone personalizados | "MarcaAí", ícone próprio em `assets/` |
| CRUD completo | Clientes, Serviços e Agendamentos (cadastro, edição, listagem e exclusão) |
| Git | Este repositório |
| **Opcionais** | Mapas e geolocalização (`react-native-maps` + `expo-location`) e integração com o WhatsApp |

## Tecnologias

- React Native 0.88 + Expo SDK 58 (JavaScript)
- React Navigation (stack + abas inferiores)
- Firebase Authentication e Cloud Firestore
- react-native-maps, expo-location, @react-native-community/datetimepicker

## Estrutura do código

```
src/
├── components/   Componentes visuais reutilizáveis (Botao, Campo, Cartao, seletores...)
├── config/       Inicialização do Firebase
├── contexts/     AuthContext: login, cadastro, logout e token
├── hooks/        useColecao: assinatura em tempo real do Firestore
├── navigation/   Rotas (pilha de telas e abas inferiores)
├── screens/      As 9 telas do app
├── services/     Acesso ao Firestore (um arquivo por entidade)
├── utils/        Formatação, confirmação e WhatsApp
├── theme.js      Cores e espaçamentos
```

### Modelo de dados (Firestore)

```
usuarios/{uid}                    nome, endereco, telefone, latitude, longitude
usuarios/{uid}/servicos/{id}      nome, preco, duracaoMin
usuarios/{uid}/clientes/{id}      nome, telefone, observacoes
usuarios/{uid}/agendamentos/{id}  clienteId, clienteNome, clienteTelefone, servicoId,
                                  servicoNome, preco, duracaoMin, data, status
```

## Como rodar

### 1. Criar o projeto no Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com) e crie um projeto.
2. Em **Authentication > Método de login**, ative **E-mail/senha**.
3. Em **Firestore Database**, crie o banco de dados.
4. Na aba **Regras** do Firestore, cole o conteúdo de [`firestore.rules`](firestore.rules) e publique.
5. Em **Configurações do projeto > Seus apps**, adicione um **App da Web** e copie as credenciais.

### 2. Configurar e iniciar o app

```bash
npm install
cp .env.example .env   # e preencha com as credenciais do Firebase
npx expo start
```

Abra o app **Expo Go** no celular e leia o QR Code (o celular e o computador precisam estar na mesma rede Wi-Fi).

## Equipe

- _Artur Bristot Rocha
- _Eric Garcia
- _Guilherme Brignolli


Professora: Mariane Joaquim Melo
