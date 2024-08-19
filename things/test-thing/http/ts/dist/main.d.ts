/********************************************************************************
 * Copyright (c) 2020 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/
declare const fs: any;
declare const path: any;
declare const parseArgs: any;
declare const JsonPlaceholderReplacer: any;
declare const WotCore: any;
declare const HttpServer: any;
declare const hostname: string;
declare let portNumber: string | number;
declare const thingName = "http-test-thing";
declare function checkPropertyWrite(expected: string, actual: unknown): void;
declare function checkActionInvocation(name: string, expected: string, actual: unknown): void;
declare const port: any;
declare const tmPath: string | undefined;
declare const thingModel: any;
declare const placeholderReplacer: any;
declare const thingDescription: any;
declare let bool: boolean;
declare let int: number;
declare let num: number;
declare let string: string;
declare let array: unknown[];
declare let object: Record<string, unknown>;
declare let servient: any;
