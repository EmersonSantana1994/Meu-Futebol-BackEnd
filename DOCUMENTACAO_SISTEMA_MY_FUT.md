# Documentacao do Sistema Meu futebol

Ultima atualizacao: 13/07/2026

Este documento descreve as regras, telas, endpoints e pontos de verificacao do novo sistema Meu futebol. A ideia e servir como checklist para validar se o sistema esta respeitando as regras do projeto antigo e as novas regras combinadas.

## 1. Visao Geral

O Meu futebol e um sistema para organizar ligas, copas, rankings de times, rankings de jogadores, artilharia, assistencias, placar eletronico, transferencias e titulos de torneios.

O projeto novo esta dividido em:

- `my-fut-api`: backend em TypeScript, Express, Prisma e MySQL.
- `my-fut-web`: frontend em Next.js com MUI gratuito.
- Banco local: MySQL via Docker.

## 1.1 Politica de Dados

Regra do projeto:

- telas que exibem informacoes do campeonato devem buscar dados do banco;
- nao deve haver lista mockada de times, jogadores, jogos, rankings ou estatisticas;
- quando nao existir dado no banco, a tela deve mostrar estado vazio;
- configuracoes de navegacao, como nome dos modulos e links do menu, podem ser estaticas porque nao representam dados do campeonato.

Status atual:

- arquivo `my-fut-web/src/data/mockData.ts` removido;
- `/times` busca `GET /registrations/teams`;
- `/dashboard` busca `GET /competitions/summary` e `GET /rankings/team-season`;
- paginas da Copa buscam times reais em `GET /registrations/teams` e geram chaveamento por `POST /cups/brackets/opening`.

## 2. Como Rodar

Na pasta raiz do projeto:

```bash
docker compose up -d
```

Backend:

```bash
cd my-fut-api
npm.cmd run dev
```

API:

```text
http://localhost:3004
```

Health check:

```text
http://localhost:3004/health
```

Frontend:

```bash
cd my-fut-web
npm.cmd run dev
```

Web:

```text
http://localhost:3000
```

Se a porta 3000 estiver ocupada, o Next pode subir em outra porta.

## 3. Banco de Dados e Migrations

O banco usa Prisma com MySQL.

Principais migrations existentes:

- `20260707145256_init`
- `20260707161000_league_registration_rules`
- `20260707173000_rankings_and_scoreboard`
- `20260707181500_team_points_to_sixteenth`
- `20260707184500_player_country`
- `20260713203000_tournament_titles_and_finalization`

A ultima migration adicionou:

- tipo de torneio para ranking de titulos;
- titulos por jogador e por temporada;
- historico de finalizacao de torneio;
- modelo de copa com 6 times.

## 4. Cadastros

Tela principal:

```text
/cadastros
```

### 4.1 Ligas

Regra:

- Primeiro cria a liga.
- Depois cria os times daquela liga.
- Depois cria os jogadores dos times daquela liga.

Status: implementado.

Endpoints:

- `GET /registrations/leagues`
- `POST /registrations/leagues`

### 4.2 Times

Regras:

- Time pertence a uma liga.
- Time pode ter nome, sigla, cor e caminho do escudo.
- A imagem do escudo nao e salva como arquivo binario no banco.
- O sistema salva apenas o caminho, por exemplo:

```text
/escudos/time-1.png
```

Status: implementado.

Endpoints:

- `GET /registrations/teams`
- `POST /registrations/teams`
- `PATCH /registrations/teams/:teamId/owner`

### 4.3 Jogadores

Regras:

- Jogador pode ter nome, posicao, pais e numero.
- Jogador pode estar em um time.
- Jogador pode ficar sem time e sem liga.
- Cada time pode ter no maximo 4 jogadores.
- Um jogador pode ser marcado como dono do time.
- O dono do time deve aparecer primeiro nas listagens.
- Se o dono sair do time em transferencia, deve ser informado o novo dono.

Status: implementado.

Endpoints:

- `GET /registrations/players`
- `POST /registrations/players`

## 5. Transferencias

Tela:

```text
/cadastros
```

### 5.1 Troca entre times

Regra:

- Time 1 compra um jogador do Time 2.
- Time 1 precisa escolher um jogador seu para sair.
- O jogador comprado vai para o Time 1.
- O jogador substituto vai para o Time 2.
- Se o jogador comprado era dono do Time 2, e preciso informar o novo dono do Time 2.

Status: implementado.

Endpoint:

- `POST /registrations/transfers/team-swap`

### 5.2 Compra de jogador sem time

Regra:

- Time compra um jogador que esta sem time.
- Time escolhe um jogador para sair.
- Jogador comprado entra no time.
- Jogador que saiu fica sem time e sem liga.
- Se o jogador que saiu era dono do time, e preciso informar o novo dono.

Status: implementado.

Endpoint:

- `POST /registrations/transfers/free-agent`

## 6. Artilharia, Assistencias e Placar Eletronico

Telas:

```text
/artilharia
/assistencias
```

### 6.1 Registro de gol

Regra:

- Ao registrar gol para um jogador, o sistema identifica o time atual do jogador.
- O placar eletronico do campeonato soma 1 gol para esse time.
- O ranking de gols do campeonato e atualizado.
- O ranking global da temporada tambem e atualizado.

Status: implementado.

Endpoint:

- `POST /rankings/goals`

### 6.2 Registro de assistencia

Regra:

- Ao registrar assistencia, o ranking de assistencias do campeonato e atualizado.
- O ranking global da temporada tambem e atualizado.
- Assistencia nao altera o placar eletronico.

Status: implementado.

Endpoint:

- `POST /rankings/assists`

### 6.3 Limpar placar

Regra:

- Existe um botao separado para limpar somente o placar eletronico.
- Esse botao nao limpa artilharia, assistencias ou ranking global.

Status: implementado.

Endpoint:

- `POST /rankings/scoreboard/clear`

### 6.4 Limpar artilharia e assistencias do campeonato

Regra:

- Existe um botao separado para limpar somente gols e assistencias do campeonato atual.
- O ranking global da temporada nao e apagado.
- O placar eletronico tambem nao e apagado por esse botao.

Status: implementado.

Endpoint:

- `POST /rankings/competition-stats/clear`

## 7. Ranking de Jogadores da Temporada

Tela:

```text
/jogadores
```

Regras:

- Mostra ranking principal de jogadores da temporada.
- Tem filtros por pais, posicao, time e liga.
- Pode ordenar por:
  - gols;
  - assistencias;
  - participacoes em gols;
  - pontos.
- Participacao em gols = gols + assistencias.

Status: implementado.

Endpoint:

- `GET /rankings/players/season-table`

## 8. Ranking de Times da Temporada

Tela:

```text
/rankings
```

Regras:

- Times acumulam pontos por colocacao em torneios.
- Existe cadastro de regra de pontos por tipo/nome de torneio.
- A pontuacao pode ir do 1 ao 16 colocado.
- Ao finalizar um torneio, o sistema usa a regra escolhida para atualizar o ranking dos times.

Status: implementado.

Endpoints:

- `GET /rankings/team-point-rules`
- `POST /rankings/team-point-rules`
- `POST /rankings/team-awards/apply`
- `GET /rankings/team-season`

## 9. Ranking de Melhores Jogadores

Tela:

```text
/rankings
```

Regras:

- Existe uma regra unica de pontuacao para melhores jogadores.
- Apenas 1, 2 e 3 melhor jogador recebem pontos.
- Ao finalizar/premiar torneio, os pontos entram no ranking de jogadores da temporada.

Status: implementado.

Endpoints:

- `GET /rankings/player-award-rule`
- `POST /rankings/player-award-rule`
- `POST /rankings/player-awards/apply`

## 10. Ranking de Titulos

Tela:

```text
/rankings
```

Regras:

- Existe cadastro de tipos de torneio.
- Exemplo:

```text
Campeonato Mundial
Copa Nacional
Liga Principal
Super Copa (cadastrada como uma Copa com esse nome)
```

- Ao finalizar um torneio, o sistema pede o tipo de torneio.
- Os jogadores do time campeao ganham 1 titulo daquele tipo.
- A tabela mostra quantas vezes cada jogador ganhou cada tipo de torneio.
- A ordenacao principal e por total de titulos da temporada.

Exemplo esperado:

```text
Jogador 1: 2 Copas, 3 Ligas, total 5 titulos
Jogador 2: 1 Copa, 1 Liga, total 2 titulos
```

Status: implementado.

Endpoints:

- `GET /rankings/title-types`
- `POST /rankings/title-types`
- `GET /rankings/player-titles?season=2025/2026`

## 11. Liga

Tela:

```text
/torneios
```

### 11.1 Formato

Regras:

- Liga tem exatamente 4 times.
- O sistema sorteia os jogos.
- Todos jogam contra todos.
- Existe turno e returno.
- Um time joga em casa no primeiro confronto e fora no segundo confronto contra o mesmo adversario.
- Total esperado: 12 jogos.

Status: implementado.

Endpoint:

- `POST /competitions/:competitionId/generate-league-fixtures`

### 11.2 Placares permitidos

Regras:

- Vitoria por 4 x 0 vale 3 pontos.
- Vitoria por 3 x 1 vale 2 pontos.
- Vitoria por 3 x 2 vale 1 ponto.
- Apenas esses resultados sao validos, para qualquer lado.

Exemplos validos:

```text
4 x 0
0 x 4
3 x 1
1 x 3
3 x 2
2 x 3
```

Status: implementado no dominio de regras.

Ponto de atencao:

- O backend valida esses placares ao recalcular regras.
- A tela ainda aceita digitar numeros livres, mas o backend rejeita placares invalidos quando a regra e aplicada.

### 11.3 Tabela da liga

Regras:

- Tabela ordena por pontos.
- Se empatar, ordena por saldo de gols.
- Mostra jogos, vitorias, derrotas, saldo e pontos.

Status: implementado.

Endpoint:

- `GET /competitions/:competitionId/standings`

### 11.4 Desempates da liga

Ordem dos criterios:

1. Pontos.
2. Saldo de gols.
3. Confronto direto entre times empatados.
4. Maior quantidade de vitorias por 4 x 0 no campeonato.
5. Maior quantidade de vitorias por 3 x 1 no campeonato.
6. Menor quantidade de derrotas por 4 x 0.
7. Menor quantidade de derrotas por 3 x 1.
8. Melhor vitoria contra times mais bem colocados no ranking.
9. Nome do time, apenas como criterio final tecnico para manter ordem estavel.

Status: implementado no backend.

Arquivo principal:

```text
my-fut-api/src/domain/football/match-rules.ts
```

Ponto de atencao:

- O criterio 8 depende da tabela base ja ordenada por pontos e saldo.
- Ele compara vitorias contra o melhor colocado, depois contra o segundo, e assim por diante.
- Se ambos venceram o mesmo adversario, ganha quem venceu com maior peso de placar:
  - 4 x 0 vale mais que 3 x 1;
  - 3 x 1 vale mais que 3 x 2.

## 12. Copa

Telas:

```text
/copa
/copa/semifinais
/copa/seis
/copa/quartas
/copa/oitavas
```

### 12.1 Modelos

Modelos disponiveis:

- 4 times: semifinais.
- 6 times: dois classificados direto e quatro disputando quartas.
- 8 times: quartas de final.
- 16 times: oitavas de final.

Status:

- modelos visuais no front: implementados;
- regra de abertura do chaveamento no backend: implementada;
- persistencia completa da copa no banco: parcial.

### 12.2 Copa com 6 times

Regras:

- Usuario informa 6 times.
- Usuario escolhe 2 times que avancam direto.
- Esses 2 times ficam em lados opostos.
- Eles so podem se enfrentar em uma final possivel.
- Os outros 4 times jogam as quartas de final.

Status: implementado no dominio e no front visual.

Endpoint:

- `POST /cups/brackets/opening`

Payload esperado:

```json
{
  "tournamentName": "Copa Exemplo",
  "model": "six-teams",
  "byeTeamIds": ["time-1", "time-2"],
  "teams": [
    { "id": "time-1", "name": "Time 1" },
    { "id": "time-2", "name": "Time 2" },
    { "id": "time-3", "name": "Time 3" },
    { "id": "time-4", "name": "Time 4" },
    { "id": "time-5", "name": "Time 5" },
    { "id": "time-6", "name": "Time 6" }
  ]
}
```

### 12.3 Regras de jogo da Copa

Regras:

- Em jogo normal de copa, vence quem fizer 4 gols primeiro.
- Resultados normais possiveis:

```text
4 x 0
4 x 1
4 x 2
4 x 3
0 x 4
1 x 4
2 x 4
3 x 4
```

- Confrontos podem ter ida e volta.
- O sistema avalia agregado.
- Se o agregado empatar, vai para prorrogacao.
- Na prorrogacao, a partir do quarto gol precisa vencer por 2 gols de diferenca.
- Exemplos validos de prorrogacao:

```text
5 x 3
6 x 4
7 x 5
```

- Exemplo invalido para encerrar prorrogacao:

```text
4 x 3
```

Status: implementado no backend.

Endpoints:

- `POST /cups/rules/aggregate-tie`
- `POST /cups/rules/validate-leg`
- `POST /cups/rules/validate-extra-time`
- `POST /cups/rules/live-second-leg`

### 12.4 Mando de campo na Copa

Regras implementadas:

- Em fases normais, o melhor time pela campanha joga a segunda partida em casa.
- Na final:
  - se um finalista jogou prorrogacao na semifinal e o outro nao, quem nao jogou prorrogacao decide em casa;
  - se os dois jogaram prorrogacao, decide em casa quem levou menos gols na prorrogacao;
  - se nenhum jogou prorrogacao, decide em casa quem sofreu menos gols nas duas partidas da semifinal;
  - se ainda empatar, precisa de decisao manual.
- Na disputa de terceiro lugar:
  - decide em casa quem fez mais gols na semifinal;
  - se empatar, precisa de decisao manual.

Status: implementado no backend e integrado ao avanço das fases da Copa.

Endpoints:

- `POST /cups/rules/second-leg-home`
- `POST /cups/rules/final-second-leg-home`
- `POST /cups/rules/third-place-second-leg-home`
- `POST /cups/brackets/:model/semifinals`
- `POST /cups/brackets/:model/final-stage`

Ao concluir as semifinais, o sistema gera na mesma Copa:

- a final com os vencedores;
- a disputa de terceiro lugar com os perdedores;
- o mando da segunda partida conforme os criterios acima;
- uma escolha manual de mando quando todos os criterios terminarem empatados.

### 12.5 Finalizacao da Copa

Ao concluir a final e a disputa de terceiro lugar, o usuario informa:

- nome da Copa;
- temporada, usada como descricao informativa;
- tipo de torneio/titulo;
- regra de pontos;
- campeao;
- vice-campeao;
- terceiro lugar;
- demais colocados que possuam pontuacao maior que zero na regra escolhida;
- primeiro, segundo e terceiro melhores jogadores.

As posicoes cadastradas com zero ponto nao aparecem no formulario. Em regras maiores,
como a de um Mundial, o formulario pode apresentar a classificacao ate o decimo sexto
lugar. Campeao, vice e terceiro sao preenchidos conforme os placares da fase final.
O sistema salva toda a classificacao, atualiza os rankings de times e jogadores e
registra o titulo para os jogadores do time campeao.

Endpoints:

- `GET /cups/brackets/:model/finalization`
- `POST /cups/brackets/:model/finalize`

### 12.6 Catalogos de posicoes e paises

Posicoes e paises sao cadastrados em uma pagina propria e utilizados como selecoes
obrigatorias no cadastro de jogadores. Nomes duplicados sao rejeitados ignorando
maiusculas, minusculas e acentos.

Os valores que ja existiam nos jogadores foram importados automaticamente para os
catalogos. Uma posicao ou pais em uso por algum jogador nao pode ser excluido.

Endpoints:

- `GET /registrations/positions`
- `POST /registrations/positions`
- `DELETE /registrations/positions/:id`
- `GET /registrations/countries`
- `POST /registrations/countries`
- `DELETE /registrations/countries/:id`

### 12.7 Rankings agregados de jogadores

A partir da tabela global de jogadores existe uma pagina de rankings agregados com
as seguintes visoes:

- paises com mais gols e assistencias;
- posicoes com mais gols e assistencias;
- times com mais gols e assistencias;
- ligas com mais gols e assistencias.

Cada linha apresenta quantidade de jogadores, gols, assistencias e participacoes
totais. A ordenacao pode ser alternada entre mais gols e mais assistencias.

Jogadores dispensados continuam na tabela global com os rotulos `Sem time` e
`Sem liga`. Seus gols, assistencias, participacoes e pontos anteriores sao
preservados. Os rankings agregados de times e ligas tambem apresentam os grupos
`Sem time` e `Sem liga`, permitindo contabilizar essas estatisticas.

Endpoint:

- `GET /rankings/players/group-rankings?groupBy=country|position|team|league&orderBy=goals|assists`

Ponto de atencao:

- A UI da Copa ainda esta mais visual/local.
- As regras existem no backend, mas a tela de copa ainda nao esta totalmente persistindo todos os jogos e avancos no banco.

## 13. Finalizacao de Torneio

Tela:

```text
/torneios
```

Regra:

- Ao terminar o ultimo placar do torneio, o usuario pode clicar em `Finalizar torneio`.
- O sistema pede:
  - nome do torneio;
  - tipo de torneio;
  - regra de pontos dos times;
  - time campeao;
  - time vice;
  - terceiro lugar;
  - 1, 2 e 3 melhores jogadores.
- Ao finalizar:
  - atualiza ranking de times;
  - atualiza ranking de melhores jogadores;
  - atualiza ranking de titulos dos jogadores campeoes;
  - marca a competicao como finalizada;
  - mostra destaque com campeao, escudo, nome do torneio, campeoes e vices.

Status: implementado.

Endpoint:

- `POST /competitions/:competitionId/finalize`

Ponto de atencao:

- O sistema ainda confia no usuario para informar campeao, vice e melhores jogadores.
- Ele nao calcula automaticamente o campeao da copa inteira, porque a persistencia completa do chaveamento ainda esta parcial.

## 14. Limpeza e Edicao de Torneio

Tela:

```text
/torneios
```

### 14.1 Limpar torneio

Regra:

- Limpa dados operacionais do torneio para iniciar outro.
- Apaga:
  - partidas;
  - placar eletronico;
  - standings/tabela;
  - artilharia e assistencias do campeonato.
- Preserva:
  - ranking global da temporada;
  - ranking de times da temporada;
  - titulos ja contabilizados.

Status: implementado.

Endpoint:

- `POST /competitions/:competitionId/clear-tournament`

### 14.2 Editar placar individual

Regra:

- Cada partida pode ter placar editado.
- Pode informar placar normal, prorrogacao e vencedor.

Status: implementado.

Endpoint:

- `PATCH /competitions/matches/:matchId/score`

### 14.3 Limpar placar individual

Regra:

- Limpa apenas o placar daquela partida.
- Nao limpa o torneio inteiro.

Status: implementado.

Endpoint:

- `POST /competitions/matches/:matchId/clear-score`

Ponto de atencao:

- Editar placar de partida nao recalcula automaticamente gols e assistencias dos jogadores.
- Gols e assistencias seguem pelo fluxo de artilharia/assistencias.

## 15. Testes e Validacao Atual

Validacoes executadas:

```bash
cd my-fut-api
npm.cmd run build
npm.cmd test
```

Resultado:

- Build do backend passou.
- Testes do backend passaram.
- Total: 30 testes aprovados.

Validacao do frontend:

```bash
cd my-fut-web
npm.cmd run build
```

Resultado:

- Build do frontend passou.

Migration aplicada:

```bash
cd my-fut-api
npx.cmd prisma migrate deploy
```

Resultado:

- Migration `20260713203000_tournament_titles_and_finalization` aplicada com sucesso.

## 16. Checklist de Conferencia Manual

Use esta lista para testar no navegador.

### Cadastros

- Criar uma liga.
- Criar 4 times para a liga.
- Cadastrar ate 4 jogadores por time.
- Marcar um jogador como dono.
- Conferir se o dono aparece primeiro.
- Fazer transferencia entre times.
- Fazer transferencia de jogador sem time.
- Testar troca envolvendo dono do time.

### Liga

- Abrir `/torneios`.
- Selecionar uma liga com 4 times.
- Clicar em `Sortear liga`.
- Conferir se foram criados 12 jogos.
- Preencher placares validos.
- Conferir tabela por pontos e saldo.
- Criar caso de empate e conferir desempates.

### Artilharia e Assistencias

- Registrar gol de um jogador.
- Conferir placar eletronico.
- Conferir artilharia do campeonato.
- Conferir ranking global da temporada.
- Registrar assistencia.
- Limpar apenas o placar.
- Limpar apenas artilharia/assistencias do campeonato.
- Conferir que o ranking global ficou preservado.

### Ranking de Titulos

- Abrir `/rankings`.
- Cadastrar tipo de torneio.
- Finalizar um torneio em `/torneios`.
- Conferir se jogadores campeoes receberam 1 titulo.
- Conferir se a tabela ordena por total de titulos.

### Finalizacao

- Informar campeao, vice, terceiro e melhores jogadores.
- Clicar em `Finalizar torneio`.
- Conferir destaque do campeao com escudo.
- Conferir jogadores campeoes e vices.
- Conferir ranking de times.
- Conferir ranking de jogadores.

### Copa

- Abrir `/copa/seis`.
- Preencher 6 times.
- Escolher 2 classificados direto.
- Gerar chaveamento.
- Conferir se os classificados diretos aparecem em lados opostos.
- Abrir modelos de 4, 8 e 16 times.
- Conferir se os campos de ida, volta e prorrogacao aparecem.

## 17. Pontos Ainda Parciais ou Para Proxima Etapa

Estes pontos existem para nao esconder nada do estado real do sistema.

### Copa persistida no banco

Status: parcial.

Hoje a Copa tem:

- regras fortes no backend;
- modelos visuais no frontend;
- endpoint de abertura de chaveamento.

Ainda falta:

- salvar todos os confrontos da copa no banco;
- avancar vencedores automaticamente;
- gerar semifinal/final/terceiro lugar a partir dos resultados;
- aplicar automaticamente mando de campo conforme campanha;
- finalizar copa com campeao calculado automaticamente.

### Validacao visual de placar da liga

Status: parcial.

O dominio sabe que apenas `4x0`, `3x1` e `3x2` sao validos, para qualquer lado.

Ainda seria bom:

- trocar campos livres por seletores de placares validos na UI;
- mostrar mensagem mais clara no front quando o usuario digitar placar invalido.

### Relacao entre placar da partida e gols/assistencias

Status: parcial.

Hoje:

- o placar da partida e editado em `/torneios`;
- gols e assistencias sao registrados em `/artilharia` e `/assistencias`;
- o placar eletronico da artilharia e separado do placar oficial da partida.

Ainda seria bom:

- vincular gols e assistencias a uma partida especifica;
- impedir placar oficial diferente da soma dos gols registrados;
- permitir corrigir gol/assistencia individualmente.

## 18. Conclusao

O sistema ja cobre a maior parte das regras principais:

- cadastros de liga, time, jogador e dono;
- transferencias;
- artilharia, assistencias e placar eletronico;
- ranking global de jogadores;
- ranking de times;
- ranking de titulos;
- finalizacao de torneio;
- liga com sorteio, pontuacao e desempates;
- regras de copa no backend;
- modelos visuais de copa 4, 6, 8 e 16 times.

Os principais pontos que ainda merecem a proxima etapa sao:

- persistencia completa da Copa;
- avancos automaticos no chaveamento;
- UI mais fechada para placares validos;
- vinculo completo entre partida oficial, gols, assistencias e placar.
