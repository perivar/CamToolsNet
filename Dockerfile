# docker build -t cam .
# OR use docker-compose

# Set runtime image
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-buster-slim AS base
WORKDIR /app
# ENV ASPNETCORE_URLS http://+:5000
# EXPOSE 5000

# Install System.Drawing native dependencies
RUN apt-get update -yq \
	&& apt-get install -y --allow-unauthenticated \
	libc6-dev \
	libgdiplus \
	libx11-dev \
	&& rm -rf /var/lib/apt/lists/*

FROM mcr.microsoft.com/dotnet/core/sdk:3.1-buster AS build

# Install current node-js and npm
RUN apt-get update -yq \
	&& apt-get install curl gnupg -yq \
	&& curl -sL https://deb.nodesource.com/setup_current.x | bash - \
	&& apt-get install nodejs -yq \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY CAMToolsNet.csproj CamToolsNet/
RUN dotnet restore CamToolsNet/CAMToolsNet.csproj

COPY  . .
#WORKDIR /src/CamToolsNet

# Install dependicies for node
RUN npm install

FROM build AS publish
RUN dotnet publish "CAMToolsNet.csproj" -c Release -o /app

FROM base AS final
WORKDIR /app
COPY --from=publish /app .
ENTRYPOINT ["dotnet", "CAMToolsNet.dll"]
