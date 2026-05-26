# Generate-OF

`Generate-OF` e um script Node.js simples para ler repositorios Git locais, buscar commits por autor e periodo, identificar arquivos criados ou alterados, classificar cada arquivo por codigo USTIBB e gerar relatorios texto de apoio.

O projeto continua propositalmente pequeno: usa `config.json` como fonte principal de configuracao, roda com `npm start` e gera arquivos de saida sem interface visual.

## O que o script gera

Ao executar o projeto, o script procura repositorios Git abaixo de `baseDir` e produz:

- um arquivo `commits.txt` para cada projeto encontrado
- um arquivo consolidado `final-commit-report.txt` em `outputDir`

Cada `commits.txt` agrupa os arquivos por codigo USTIBB e calcula o subtotal usando os valores definidos em `ustibb_map.json`.

## Configuracao

Edite `config.json`:

- `baseDir`: pasta raiz onde estao os repositorios Git locais
- `author`: nome ou email usado para filtrar os commits
- `since`: data inicial no formato `YYYY-MM-DD`; quando vazio, o script usa os ultimos 7 dias
- `until`: data final no formato `YYYY-MM-DD`; quando vazio, o script usa a data atual
- `outputDir`: pasta onde os relatorios serao gerados
- `allowDuplicates`: controla se o mesmo arquivo pode aparecer mais de uma vez no periodo filtrado
- `card`: numero do card usado apenas para incluir as atividades ageis `5.32.1`, `5.32.2` e `5.32.3` no relatorio final
- `debug`: quando `true`, imprime informacoes adicionais de execucao

Exemplo:

```json
{
	"baseDir": "/caminho/para/projetos",
	"author": "seu.usuario",
	"since": "2026-05-01",
	"until": "2026-05-31",
	"outputDir": "./output",
	"allowDuplicates": false,
	"card": "123456",
	"debug": false
}
```

## Como funciona `allowDuplicates`

- Quando `allowDuplicates` for `true`, o mesmo arquivo pode aparecer repetido em commits diferentes dentro do periodo.
- Quando `allowDuplicates` for `false`, o script mantem apenas a primeira ocorrencia encontrada para o arquivo.

Como o `git log` e lido do commit mais recente para o mais antigo, essa primeira ocorrencia tende a ser a versao mais recente do periodo filtrado.

## Como funciona o campo `card`

O projeto trata `card` e `task` no assunto do commit:

- commits com `card 123456` aparecem no detalhe do arquivo como `card 123456`
- commits antigos com `task 123456` continuam sendo aceitos e aparecem como `task 123456`
- commits sem `card` e sem `task` nao quebram a execucao

Exemplos de linhas geradas:

```text
meu-projeto/src/app/home/home.component.ts#abcdef1234; card 123456
meu-projeto/src/main/java/br/com/exemplo/Recurso.java#123456abcd; task 654321
meu-projeto/src/main/resources/application.properties#fedcba9876;
```

Importante:

- commits sem `card` podem aparecer normalmente no `commits.txt`
- commits sem `card` nao geram linhas automaticas de atividades ageis no `final-commit-report.txt`
- o bloco agil `5.32.1`, `5.32.2` e `5.32.3` so e adicionado quando `config.card` estiver preenchido

## Classificacao de arquivos

O classificador foi mantido simples, mas com regras explicitas para evitar ambiguidades:

- `.ts` e `.js` entram como JavaScript/TypeScript (`5.10.5` e `5.10.6`)
- `.html`, `.xhtml`, `.jsp`, `.vtl`, `.xsl` e `.php` entram como tela (`5.10.1` e `5.10.2`)
- `.css` e `.scss` entram como CSS/SCSS (`5.10.3` e `5.10.4`)
- `.java` entra como objeto Java (`5.10.9` e `5.10.10`)
- `.xml` e tratado com prioridade explicita:
	- em caminhos com indicio de tela/template, entra como tela
	- nos demais casos, entra como arquivo chave/valor ou tipo XML (`5.10.7` e `5.10.8`)

Arquivos irrelevantes sao ignorados por padrao, incluindo casos comuns como:

- `package-lock.json`
- `node_modules`
- `.git`
- `dist`
- `target`
- `.angular`
- `build`
- `output`
- arquivos temporarios e logs

Arquivos deletados nao sao contabilizados.

## Itens USTIBB contemplados

O arquivo `ustibb_map.json` esta alinhado com os itens usados pelo script no fluxo atual, incluindo:

- `5.10.1` a `5.10.10`
- `5.32.1` com `19 USTIBB`
- `5.32.2` com `17 USTIBB`
- `5.32.3` com `9 USTIBB`

Os itens `5.32.x` existentes no mapa nao entram automaticamente no relatorio final por descoberta de commit. No fluxo atual, apenas `5.32.1`, `5.32.2` e `5.32.3` podem ser adicionados, e somente quando `config.card` estiver preenchido.

## Como atualizar `ustibb_map.json`

`ustibb_map.json` e a fonte dos codigos, descricoes e pontuacoes USTIBB usados pelo relatorio.

Para atualizar o mapa:

1. ajuste descricao e pontuacao do codigo desejado
2. mantenha os codigos usados pelo classificador atual (`5.10.1` a `5.10.10`)
3. adicione novos itens apenas se houver regra clara para usa-los sem alterar o fluxo atual

O script nao exige listas interativas nem selecao manual durante a execucao. Se um item novo for incluido apenas no mapa, ele fica disponivel para evolucoes futuras, mas nao passa a aparecer automaticamente no relatorio final sem logica explicita no codigo.

## Uso

```bash
npm install
npm start
```

Se `debug` estiver habilitado no `config.json`, a execucao imprime mensagens extras para ajudar na analise do filtro de commits e do processamento dos repositorios.
