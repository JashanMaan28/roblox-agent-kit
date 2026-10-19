--!strict
-- Server entry point (ServerScriptService.Server). Require server-only modules from here.

local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player: Player)
	print(`[server] {player.Name} joined`)
end)
