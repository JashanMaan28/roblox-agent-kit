--!strict
-- Client entry point (StarterPlayerScripts.Client). Never trust the client: validate everything on the server.

local Players = game:GetService("Players")

local player = Players.LocalPlayer
print(`[client] running for {player.Name}`)
