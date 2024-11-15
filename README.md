# Acronimi
Un gioco sugli acronimi.

Sto usando soprattutto Javascript con il framework [Colyseus](https://colyseus.io/)
Il tutto è attualmente hostato localmente ma non dovrebbe essere difficile configurare un server remoto dato che usa Node e WebSocket.

Pagina di Notion:
https://www.notion.so/romanofranceso/Gioco-acronimi-12ada23e29518098abd6c8438e67d2da?pvs=4

## Note
CI SONO VARI COMMENTI/RIMASUGLI/NOMI STRANI PERCHE STO USANDO COPILOT

## DA FARE:
- Aggiungere il sistema che salva gli acronimi delle persone e li mostra in una schermata tra i round (es. fine.html/fine-host.html)

## Progressi
15/11 - Per adesso sono riuscito a creare un sistema di Creazione/Join stanza con acronimi sincronizzati e anche un bottone che l'host può premere per finire il round.
_Attualmente c'è questo strano problema per cui quando viene creata una stanza l'host si sconnette e riconnette una volta con un id diverso, funziona comunque dato che in teoria il token si salva localmente (?)_