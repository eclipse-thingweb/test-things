/********************************************************************************
 * Copyright (c) 2024 Contributors to the Eclipse Foundation
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

import * as chai from "chai";
import * as http from "http";
import { getTDValidate } from "../../../../../util/util";
import { ValidateFunction } from "ajv";
import { port } from './fixtures'

const expect = chai.expect;

let validate: ValidateFunction | undefined;

describe("TD Test", () => {
    before(async () => {
        const tdValidate = getTDValidate();

        try {
            const response = await Promise.all([tdValidate]);
            validate = response[0].validate;
        } catch (error) {
            console.log(error);
        }
    });

    it("should have a valid TD", (done) => {
        http.get(
            `http://localhost:${port}/http-data-schema-thing`,
            function (response: http.IncomingMessage) {
                const body: Buffer[] = [];
                response.on("data", (chunk: Buffer) => {
                    body.push(chunk);
                });

                response.on("end", () => {
                    try {
                        const result = JSON.parse(
                            Buffer.concat(body).toString(),
                        );
                        const valid =
                            validate && result !== ""
                                ? validate(result)
                                : false;
                        expect(valid).to.be.true;
                        done();
                    } catch (error) {
                        console.log(error);
                        done(error);
                    }
                });
            },
        );
    });
});
