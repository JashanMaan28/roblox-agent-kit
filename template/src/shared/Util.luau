--!strict
-- Shared helpers available to both server and client (ReplicatedStorage.Shared.Util).

local Util = {}

function Util.clamp01(value: number): number
	return math.clamp(value, 0, 1)
end

function Util.formatNumber(value: number): string
	local suffixes = { "", "K", "M", "B", "T" }
	local index = 1
	while math.abs(value) >= 1000 and index < #suffixes do
		value /= 1000
		index += 1
	end
	if index == 1 then
		return tostring(math.floor(value))
	end
	return string.format("%.1f%s", value, suffixes[index])
end

return Util
