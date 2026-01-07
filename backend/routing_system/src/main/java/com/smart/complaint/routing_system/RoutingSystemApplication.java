package com.smart.complaint.routing_system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class RoutingSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(RoutingSystemApplication.class, args);
	}

}
