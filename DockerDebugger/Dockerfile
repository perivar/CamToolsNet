FROM microsoft/dotnet

RUN apt-get update && apt-get -y install openssh-server unzip
RUN mkdir /var/run/sshd && chmod 0755 /var/run/sshd 
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin without-password/g' /etc/ssh/sshd_config
RUN sed -i 's/#StrictModes yes/StrictModes no/g' /etc/ssh/sshd_config

RUN service ssh restart

RUN mkdir /root/.vs-debugger && chmod 0755 /root/.vs-debugger
RUN curl -sSL https://aka.ms/getvsdbgsh | bash /dev/stdin -v vs2017u1 -l /root/.vs-debugger/

EXPOSE 22  
